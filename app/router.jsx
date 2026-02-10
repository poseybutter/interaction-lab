import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "./ui/AppLayout.jsx";
import { PatternsBasicsFadePage } from "./ui/pages/patterns/PatternsBasicsFadePage.jsx";
import { DemoLabPage } from "./ui/pages/demo/DemoLabPage.jsx";
import { NotReadyPage } from "./ui/pages/NotReadyPage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/patterns/basics/fade" replace /> },

      // MVP: Patterns
      { path: "patterns/basics/fade", element: <PatternsBasicsFadePage /> },

      // MVP: Demo
      { path: "demo", element: <DemoLabPage /> },
      { path: "demo/fade", element: <Navigate to="/demo?id=fade" replace /> },
      { path: "demo/basics/fade", element: <Navigate to="/demo?id=fade" replace /> },

      // 나머지 메뉴는 Route는 열되, 페이지는 준비 중으로 처리(MVP)
      { path: "patterns/*", element: <NotReadyPage title="Patterns" /> },
      { path: "demo/*", element: <NotReadyPage title="Demo" /> },

      // 404
      { path: "*", element: <NotReadyPage title="페이지를 찾을 수 없습니다" /> }
    ]
  }
]);

