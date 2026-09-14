import React from "react";
import { createRoot } from "react-dom/client";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { LogementProvider } from "./context/LogementContext";
import { MapDataProvider } from "./context/MapDataContext";
ReactDOM.render(
  <LogementProvider>
    <MapDataProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </MapDataProvider>
  </LogementProvider>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
