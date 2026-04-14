require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const port = 80;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 데이터베이스 연결 상태를 저장할 변수
let dbConnection = null;

// ============================================================
// SHA-256 해싱 함수 (Task 2.2)
// ============================================================

function generateHash(title, destination, content) {
  const data = `${title}|${destination}|${content}`;
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function verifyIntegrity(trip) {
  const currentHash = generateHash(trip.title, trip.destination, trip.content);
  return currentHash === trip.integrity_hash;
}

// ============================================================
// 데이터베이스 연결 (Task 2.1)
// ============================================================

const connectToDatabase = () => {
  try {
    const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );

    if (missingEnvVars.length > 0) {
      console.error(
        "필수 데이터베이스 환경변수가 없습니다:",
        missingEnvVars.join(", "),
      );
      return null;
    }

    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    return new Promise((resolve, reject) => {
      connection.connect(async (err) => {
        if (err) {
          console.error("데이터베이스 연결 실패:", err);
          reject(err);
          return;
        }

        console.log("데이터베이스 연결 성공");

        try {
          await createTripsTable(connection);
          dbConnection = connection;
          resolve(connection);
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("데이터베이스 연결 중 오류:", error);
    return Promise.reject(error);
  }
};

// trips 테이블 생성 함수
const createTripsTable = (connection) => {
  return new Promise((resolve, reject) => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS trips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        destination VARCHAR(200) NOT NULL,
        travel_date DATE DEFAULT NULL,
        content TEXT NOT NULL,
        integrity_hash VARCHAR(64) NOT NULL,
        ai_recommendation TEXT DEFAULT NULL,
        ai_advice TEXT DEFAULT NULL,
        ai_type ENUM('gemini', 'nova') DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    connection.query(createTableQuery, (err, result) => {
      if (err) {
        console.error("테이블 생성 중 오류:", err);
        reject(err);
        return;
      }
      console.log("Trips 테이블 준비 완료");
      resolve(result);
    });
  });
};

// DB 연결 상태 체크 미들웨어
const checkDbConnection = (req, res, next) => {
  if (!dbConnection) {
    return res.status(503).json({
      error: "데이터베이스 연결 실패",
      message:
        "현재 데이터베이스 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.",
    });
  }
  next();
};

// ============================================================
// Lambda 호출 함수
// ============================================================

const callGeminiLambda = async (content, tripId) => {
  if (!process.env.GEMINI_LAMBDA_URL) {
    throw new Error("Gemini Lambda URL이 설정되지 않았습니다");
  }

  try {
    const response = await axios.post(process.env.GEMINI_LAMBDA_URL, {
      content,
      tripId,
    });
    return response.data;
  } catch (error) {
    console.error("Gemini Lambda 호출 중 오류:", error);
    throw new Error("Gemini 서비스 호출 실패");
  }
};

const callNovaLambda = async (content, tripId) => {
  if (!process.env.BEDROCK_LAMBDA_URL) {
    throw new Error("Bedrock Lambda URL이 설정되지 않았습니다");
  }

  try {
    const response = await axios.post(process.env.BEDROCK_LAMBDA_URL, {
      content,
      tripId,
    });
    return response.data;
  } catch (error) {
    console.error("Nova Lambda 호출 중 오류:", error);
    throw new Error("Nova 서비스 호출 실패");
  }
};

// ============================================================
// API 엔드포인트 (Task 2.1, 2.3, 2.4, 2.5)
// ============================================================

// 서버 상태 확인 (Task 2.1)
app.get("/", (req, res) => {
  res.json({
    message: "서버 실행 중",
    status: {
      database: dbConnection ? "연결됨" : "연결 안됨",
      gemini_lambda_url: process.env.GEMINI_LAMBDA_URL ? "설정됨" : "설정 안됨",
      nova_lambda_url: process.env.BEDROCK_LAMBDA_URL ? "설정됨" : "설정 안됨",
    },
  });
});

// Trip 생성 (Task 2.3)
app.post("/trips", checkDbConnection, async (req, res) => {
  const { title, destination, travel_date, content } = req.body;

  if (!title?.trim() || !destination?.trim() || !content?.trim()) {
    return res
      .status(400)
      .json({ error: "제목, 여행지, 내용은 필수입니다" });
  }

  const integrity_hash = generateHash(title, destination, content);

  const sql =
    "INSERT INTO trips (title, destination, travel_date, content, integrity_hash) VALUES (?, ?, ?, ?, ?)";

  dbConnection.query(
    sql,
    [title, destination, travel_date || null, content, integrity_hash],
    (err, result) => {
      if (err) {
        console.error("여행 기록 저장 중 오류:", err);
        return res.status(500).json({ error: "여행 기록 저장 실패" });
      }

      res.status(201).json({
        message: "여행 기록이 저장되었습니다",
        id: result.insertId,
      });
    },
  );
});

// 전체 Trip 조회 (Task 2.3)
app.get("/trips", checkDbConnection, async (req, res) => {
  const sql = "SELECT * FROM trips ORDER BY created_at DESC";

  dbConnection.query(sql, (err, results) => {
    if (err) {
      console.error("여행 기록 조회 중 오류:", err);
      return res.status(500).json({ error: "여행 기록 조회 실패" });
    }

    const tripsWithIntegrity = results.map((trip) => ({
      ...trip,
      integrity_verified: verifyIntegrity(trip),
    }));

    res.json(tripsWithIntegrity);
  });
});

// 특정 Trip 삭제 (Task 2.3)
app.delete("/trips/:id", checkDbConnection, async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM trips WHERE id = ?";

  dbConnection.query(sql, [id], (err, result) => {
    if (err) {
      console.error("여행 기록 삭제 중 오류:", err);
      return res.status(500).json({ error: "여행 기록 삭제 실패" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "해당 ID의 여행 기록을 찾을 수 없습니다" });
    }

    res.json({ message: "여행 기록이 삭제되었습니다" });
  });
});

// 전체 Trip 삭제 (Task 2.3)
app.delete("/trips", checkDbConnection, async (req, res) => {
  const sql = "DELETE FROM trips";

  dbConnection.query(sql, (err, result) => {
    if (err) {
      console.error("전체 여행 기록 삭제 중 오류:", err);
      return res.status(500).json({ error: "전체 여행 기록 삭제 실패" });
    }

    res.json({
      message: "모든 여행 기록이 삭제되었습니다",
      deletedCount: result.affectedRows,
    });
  });
});

// Gemini 여행지 추천 요청 (Task 2.4)
app.post("/gemini-trips", checkDbConnection, async (req, res) => {
  const { content, tripId } = req.body;

  if (!content?.trim() || !tripId) {
    return res.status(400).json({ error: "내용과 Trip ID가 필요합니다" });
  }

  if (!process.env.GEMINI_LAMBDA_URL) {
    return res.status(503).json({
      error: "Gemini 서비스 사용 불가",
      message:
        "현재 Gemini 서비스를 사용할 수 없습니다. Lambda URL 설정을 확인해주세요.",
    });
  }

  try {
    console.log("Gemini Lambda 함수 호출 중...");
    const aiResponse = await callGeminiLambda(content, tripId);
    console.log("Gemini Lambda 함수 호출 완료");

    const updateSql =
      "UPDATE trips SET ai_recommendation = ?, ai_type = 'gemini' WHERE id = ?";
    dbConnection.query(updateSql, [aiResponse, tripId], (err, result) => {
      if (err) {
        console.error("AI 응답 저장 중 오류:", err);
        return res.status(500).json({ error: "AI 응답 저장 실패" });
      }

      res.json({ message: "Gemini 추천 요청이 처리되었습니다" });
    });
  } catch (error) {
    console.error("Gemini 추천 요청 처리 중 오류:", error);
    res.status(500).json({
      error: "Gemini 서비스 처리 실패",
      message: "잠시 후 다시 시도해주세요",
    });
  }
});

// Nova 일정 조언 요청 (Task 2.5)
app.post("/nova-trips", checkDbConnection, async (req, res) => {
  const { content, tripId } = req.body;

  if (!content?.trim() || !tripId) {
    return res.status(400).json({ error: "내용과 Trip ID가 필요합니다" });
  }

  if (!process.env.BEDROCK_LAMBDA_URL) {
    return res.status(503).json({
      error: "Nova 서비스 사용 불가",
      message:
        "현재 Nova 서비스를 사용할 수 없습니다. Lambda URL 설정을 확인해주세요.",
    });
  }

  try {
    console.log("Nova Lambda 함수 호출 중...");
    const aiResponse = await callNovaLambda(content, tripId);
    console.log("Nova Lambda 함수 호출 완료");

    const updateSql =
      "UPDATE trips SET ai_advice = ?, ai_type = 'nova' WHERE id = ?";
    dbConnection.query(updateSql, [aiResponse, tripId], (err, result) => {
      if (err) {
        console.error("AI 응답 저장 중 오류:", err);
        return res.status(500).json({ error: "AI 응답 저장 실패" });
      }

      res.json({ message: "Nova 조언 요청이 처리되었습니다" });
    });
  } catch (error) {
    console.error("Nova 조언 요청 처리 중 오류:", error);
    res.status(500).json({
      error: "Nova 서비스 처리 실패",
      message: "잠시 후 다시 시도해주세요",
    });
  }
});

// ============================================================
// 에러 처리 및 서버 시작
// ============================================================

process.on("uncaughtException", (error) => {
  console.error("처리되지 않은 에러:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("처리되지 않은 Promise 거부:", error);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectToDatabase();

    app.listen(port, () => {
      console.log("\n=== 서버 상태 ===");
      console.log(`포트: ${port}`);
      console.log(
        `Gemini Lambda URL: ${
          process.env.GEMINI_LAMBDA_URL ? "설정됨 ✅" : "설정 안됨 ⚠️"
        }`,
      );
      console.log(
        `Nova Lambda URL: ${
          process.env.BEDROCK_LAMBDA_URL ? "설정됨 ✅" : "설정 안됨 ⚠️"
        }`,
      );
      if (!process.env.GEMINI_LAMBDA_URL || !process.env.BEDROCK_LAMBDA_URL) {
        console.log(
          "※ Lambda URL이 설정되지 않은 AI 기능은 사용할 수 없습니다.",
        );
      }
      console.log("=================\n");
    });
  } catch (error) {
    console.error("서버 시작 실패:", error);
    process.exit(1);
  }
};

startServer();
