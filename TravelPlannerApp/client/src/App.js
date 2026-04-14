import React, { useState, useEffect } from "react";
import "./App.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL;

function App() {
  const [trips, setTrips] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
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
      if (!response.ok) throw new Error("서버 오류");
      const data = await response.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("여행 계획 조회 오류:", error);
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
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          content: formData.content,
        }),
      });
      await fetchTrips();
      setFormData({ title: "", destination: "", startDate: "", endDate: "", content: "" });
    } catch (error) {
      console.error("여행 계획 추가 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTrip = async (id) => {
    try {
      await fetch(`${SERVER_URL}/trips/${id}`, { method: "DELETE" });
      await fetchTrips();
    } catch (error) {
      console.error("삭제 오류:", error);
    }
  };

  const deleteAllTrips = async () => {
    if (!window.confirm("모든 여행 계획을 삭제하시겠습니까?")) return;
    try {
      await fetch(`${SERVER_URL}/trips`, { method: "DELETE" });
      await fetchTrips();
    } catch (error) {
      console.error("전체 삭제 오류:", error);
    }
  };

  const requestGemini = async (tripContent, tripId) => {
    if (aiRequestInProgress.id) return;
    setAiRequestInProgress({ id: tripId, type: "gemini" });
    try {
      const res = await fetch(`${SERVER_URL}/gemini-trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tripContent, tripId }),
      });
      if (!res.ok) throw new Error("Gemini 요청 실패");
      await fetchTrips();
    } catch (error) {
      console.error("Gemini 오류:", error);
    } finally {
      setAiRequestInProgress({ id: null, type: null });
    }
  };

  const requestNova = async (tripContent, tripId) => {
    if (aiRequestInProgress.id) return;
    setAiRequestInProgress({ id: tripId, type: "nova" });
    try {
      const res = await fetch(`${SERVER_URL}/nova-trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tripContent, tripId }),
      });
      if (!res.ok) throw new Error("Nova 요청 실패");
      await fetchTrips();
    } catch (error) {
      console.error("Nova 오류:", error);
    } finally {
      setAiRequestInProgress({ id: null, type: null });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = formData.title.trim() && formData.destination.trim() && formData.content.trim();

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>✈️ TravelPlanner</h1>
          <p>나만의 여행 계획을 세우고, AI에게 추천받아 보세요</p>
        </div>
      </header>

      <main className="main">
        <section className="form-section">
          <h2>새 여행 계획</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">여행 제목</label>
              <input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="예: 제주도 힐링 여행" />
            </div>
            <div className="form-group">
              <label htmlFor="destination">여행지</label>
              <input id="destination" name="destination" value={formData.destination} onChange={handleChange} placeholder="예: 제주도" />
            </div>
            <div className="form-group">
              <label htmlFor="startDate">출발일</label>
              <input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">도착일</label>
              <input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group full-width">
            <label htmlFor="content">여행 계획 상세</label>
            <textarea id="content" name="content" value={formData.content} onChange={handleChange} placeholder="방문할 장소, 하고 싶은 활동, 예산 등을 적어보세요..." rows="4" />
          </div>
          <div className="form-actions">
            <button onClick={addTrip} disabled={isLoading || !isFormValid} className="btn btn-primary">
              {isLoading ? "저장 중..." : "계획 등록"}
            </button>
            <button onClick={deleteAllTrips} className="btn btn-outline-danger">전체 삭제</button>
          </div>
        </section>

        <section className="trips-section">
          <h2>내 여행 계획 ({trips.length})</h2>
          {trips.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🗺️</span>
              <p>아직 등록된 여행 계획이 없어요</p>
              <p className="empty-sub">위에서 새 여행 계획을 만들어보세요</p>
            </div>
          ) : (
            <div className="trip-list">
              {trips.map((trip) => {
                const isRequesting = aiRequestInProgress.id === trip.id;
                const hasNoAI = !trip.ai_recommendation && !trip.ai_advice;
                return (
                  <article key={trip.id} className="trip-card">
                    <div className="card-top">
                      <div className="card-title-row">
                        <h3>{trip.title}</h3>
                        <span className={`badge ${trip.integrity_verified ? "badge-ok" : "badge-warn"}`}>
                          {trip.integrity_verified ? "✅ 검증됨" : "⚠️ 변조 의심"}
                        </span>
                      </div>
                      <div className="card-meta">
                        <span>📍 {trip.destination}</span>
                        {trip.start_date && trip.end_date && (
                          <span>📅 {formatDate(trip.start_date)} ~ {formatDate(trip.end_date)}</span>
                        )}
                        {trip.start_date && !trip.end_date && (
                          <span>📅 {formatDate(trip.start_date)} ~</span>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <p>{trip.content}</p>
                    </div>

                    {trip.ai_recommendation && (
                      <div className="ai-box ai-gemini">
                        <div className="ai-label">🤖 Gemini 여행지 추천</div>
                        <p>{trip.ai_recommendation}</p>
                      </div>
                    )}
                    {trip.ai_advice && (
                      <div className="ai-box ai-nova">
                        <div className="ai-label">🌟 Nova 일정 조언</div>
                        <p>{trip.ai_advice}</p>
                      </div>
                    )}

                    <div className="card-actions">
                      {hasNoAI && !isRequesting && (
                        <>
                          <button onClick={() => requestGemini(trip.content, trip.id)} className="btn btn-gemini" disabled={aiRequestInProgress.id !== null}>🤖 Gemini 추천</button>
                          <button onClick={() => requestNova(trip.content, trip.id)} className="btn btn-nova" disabled={aiRequestInProgress.id !== null}>🌟 Nova 조언</button>
                        </>
                      )}
                      {isRequesting && (
                        <div className="loading-pill">
                          {aiRequestInProgress.type === "gemini" ? "🤖 Gemini 분석 중..." : "🌟 Nova 분석 중..."}
                        </div>
                      )}
                      <button onClick={() => deleteTrip(trip.id)} className="btn btn-danger-sm" disabled={isRequesting}>삭제</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
