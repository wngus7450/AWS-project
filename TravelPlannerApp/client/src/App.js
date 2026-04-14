// App.js
import React, { useState, useEffect } from "react";
import "./App.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL;

function App() {
  const [trips, setTrips] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    travelDate: "",
    content: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [aiRequestInProgress, setAiRequestInProgress] = useState({
    id: null,
    type: null,
  });

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/trips`);

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setTrips(data);
      } else {
        console.error("서버에서 배열이 아닌 데이터를 받았습니다:", data);
        setTrips([]);
      }
    } catch (error) {
      console.error("여행 기록 조회 중 오류 발생:", error);
      setTrips([]);
    }
  };

  const addTrip = async () => {
    if (!formData.title.trim() || !formData.destination.trim() || !formData.content.trim()) return;

    setIsLoading(true);
    try {
      await fetch(`${SERVER_URL}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          destination: formData.destination,
          travel_date: formData.travelDate || null,
          content: formData.content,
        }),
      });
      await fetchTrips();
      setFormData({ title: "", destination: "", travelDate: "", content: "" });
    } catch (error) {
      console.error("여행 기록 추가 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTrip = async (id) => {
    try {
      await fetch(`${SERVER_URL}/trips/${id}`, { method: "DELETE" });
      await fetchTrips();
    } catch (error) {
      console.error("여행 기록 삭제 중 오류 발생:", error);
    }
  };

  const deleteAllTrips = async () => {
    if (!window.confirm("모든 여행 기록을 삭제하시겠습니까?")) return;

    try {
      await fetch(`${SERVER_URL}/trips`, { method: "DELETE" });
      await fetchTrips();
    } catch (error) {
      console.error("전체 여행 기록 삭제 중 오류 발생:", error);
    }
  };

  const requestGeminiRecommendation = async (tripContent, tripId) => {
    if (aiRequestInProgress.id) return;

    setAiRequestInProgress({ id: tripId, type: "gemini" });
    try {
      const response = await fetch(`${SERVER_URL}/gemini-trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tripContent,
          tripId: tripId,
        }),
      });

      if (!response.ok) {
        throw new Error("Gemini 추천 요청 실패");
      }

      await fetchTrips();
    } catch (error) {
      console.error("Gemini 추천 요청 중 오류 발생:", error);
    } finally {
      setAiRequestInProgress({ id: null, type: null });
    }
  };

  const requestNovaAdvice = async (tripContent, tripId) => {
    if (aiRequestInProgress.id) return;

    setAiRequestInProgress({ id: tripId, type: "nova" });
    try {
      const response = await fetch(`${SERVER_URL}/nova-trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tripContent,
          tripId: tripId,
        }),
      });

      if (!response.ok) {
        throw new Error("Nova 조언 요청 실패");
      }

      await fetchTrips();
    } catch (error) {
      console.error("Nova 조언 요청 중 오류 발생:", error);
    } finally {
      setAiRequestInProgress({ id: null, type: null });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid =
    formData.title.trim() && formData.destination.trim() && formData.content.trim();

  return (
    <div className="App">
      <div className="container">
        <h1>✈️ 여행 플래너</h1>
        <h3>🌍 나만의 여행 계획을 기록하고 AI 추천을 받아보세요</h3>

        <div className="input-section">
          <div className="form-row">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="📍 여행 제목"
              className="form-input"
            />
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleInputChange}
              placeholder="🗺️ 여행지"
              className="form-input"
            />
          </div>
          <div className="form-row">
            <input
              type="date"
              name="travelDate"
              value={formData.travelDate}
              onChange={handleInputChange}
              className="form-input date-input"
            />
          </div>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="🏖️ 여행 계획이나 일기를 작성해보세요..."
            className="trip-input"
          />
          <div className="button-group">
            <button
              onClick={addTrip}
              disabled={isLoading || !isFormValid}
              className="primary-button"
            >
              {isLoading ? "저장 중..." : "✈️ 여행 기록 추가"}
            </button>
            <button onClick={deleteAllTrips} className="danger-button">
              🗑️ 전체 기록 삭제
            </button>
          </div>
        </div>

        <h2>🗺️ 내 여행 기록</h2>
        <div className="trips-container">
          {Array.isArray(trips) && trips.length === 0 ? (
            <p className="no-trips">아직 기록된 여행 계획이 없습니다. ✈️</p>
          ) : (
            Array.isArray(trips) &&
            trips.map((trip) => {
              const isRequestingAI = aiRequestInProgress.id === trip.id;
              const hasNoAI = !trip.ai_recommendation && !trip.ai_advice;

              return (
                <div key={trip.id} className="trip-card">
                  <div className="trip-header">
                    <h3 className="trip-title">📍 {trip.title}</h3>
                    <span className="integrity-badge">
                      {trip.integrity_verified === true
                        ? "✅ 검증됨"
                        : "⚠️ 변조 의심"}
                    </span>
                  </div>

                  <div className="trip-meta">
                    <span className="trip-destination">🗺️ {trip.destination}</span>
                    {trip.travel_date && (
                      <span className="trip-date">
                        📅 {new Date(trip.travel_date).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                  </div>

                  <div className="trip-content">
                    <p>{trip.content}</p>
                  </div>

                  {trip.ai_recommendation && (
                    <div className="ai-recommendation">
                      <strong>🤖 Gemini 여행지 추천:</strong>
                      <p>{trip.ai_recommendation}</p>
                    </div>
                  )}

                  {trip.ai_advice && (
                    <div className="ai-advice">
                      <strong>🌟 Nova 일정 조언:</strong>
                      <p>{trip.ai_advice}</p>
                    </div>
                  )}

                  <div className="trip-actions">
                    {hasNoAI && !isRequestingAI && (
                      <div className="ai-buttons">
                        <button
                          onClick={() =>
                            requestGeminiRecommendation(trip.content, trip.id)
                          }
                          className="gemini-button"
                          disabled={aiRequestInProgress.id !== null}
                        >
                          🤖 Gemini 추천
                        </button>
                        <button
                          onClick={() =>
                            requestNovaAdvice(trip.content, trip.id)
                          }
                          className="nova-button"
                          disabled={aiRequestInProgress.id !== null}
                        >
                          🌟 Nova 조언
                        </button>
                      </div>
                    )}

                    {isRequestingAI && (
                      <div className="loading-state">
                        <span>
                          {aiRequestInProgress.type === "gemini"
                            ? "🤖 Gemini가 여행지를 분석 중입니다..."
                            : "🌟 Nova가 일정을 분석 중입니다..."}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => deleteTrip(trip.id)}
                      className="danger-button"
                      disabled={isRequestingAI}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
