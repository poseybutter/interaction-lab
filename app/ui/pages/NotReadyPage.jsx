import React from "react";

export function NotReadyPage({ title }) {
  return (
    <div className="app-page">
      <div className="page-title-wrap">
        <h1 className="h-tit">{title}</h1>
        <div className="g-info-box">
          <p className="g-desc">이 페이지는 아직 준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
}

