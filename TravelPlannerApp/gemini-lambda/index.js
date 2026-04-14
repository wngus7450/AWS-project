const { GoogleGenerativeAI } = require("@google/generative-ai");
const mysql = require('mysql2');

exports.handler = async (event) => {
    console.log("EC2 -> Lambda로 전달된 데이터", event.body);
    // 환경 변수에서 Gemini API 키와 데이터베이스 연결 정보를 불러옵니다.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let inputData;
    try {
        inputData = JSON.parse(event.body);
    } catch (error) {
        console.error('JSON 파싱 오류:', error);
        return { statusCode: 400, body: 'Invalid JSON format' };
    }

    if (!inputData || !inputData.content || !inputData.tripId) {
        console.error('Invalid request: No content or tripId provided');
        return { statusCode: 400, body: 'No content or tripId provided' };
    }

    const userMessage = inputData.content;
    const tripId = inputData.tripId;
    console.log("ai한테 보낼 유저 메시지 내용", inputData.content, typeof inputData.content);

    try {
        // Gemini AI API 호출 (여행 전문가 프롬프트)
        const prompt = `당신은 여행 전문가입니다. 사용자의 여행 계획을 바탕으로 해당 여행지에 대한 추천 정보, 맛집, 관광 명소, 주의사항 등을 한국어로 3문장 이상 제공해주세요.

사용자 입력: ${userMessage}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text();

        console.log("ai 한테 받아왔어?", aiResponse);

        // 데이터베이스에 AI 응답 저장
        const dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };
        const db = mysql.createConnection(dbConfig);
        db.connect();

        const sql = 'UPDATE trips SET ai_recommendation = ?, ai_type = ? WHERE id = ?';
        const values = [aiResponse, 'gemini', tripId];
        await new Promise((resolve, reject) => {
            db.query(sql, values, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });

        db.end();

        return aiResponse;
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Lambda function error');
    }
};
