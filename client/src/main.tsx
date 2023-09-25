import ReactDOM from "react-dom/client";
import App from "./components/App.tsx";
import "@sweetalert2/theme-minimal/minimal.min.css";
import "./assets/styles/index.css";
import "./assets/styles/App.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
