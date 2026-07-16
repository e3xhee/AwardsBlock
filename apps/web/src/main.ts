import "./styles/base.css";
import { renderRoute } from "./router/router";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app root element was not found.");
}

const appRoot = app;

function render() {
  appRoot.innerHTML = renderRoute(window.location.pathname);
}

window.addEventListener("popstate", render);
render();
