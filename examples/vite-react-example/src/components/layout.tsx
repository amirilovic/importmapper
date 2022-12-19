import Navigation from "./navigation";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <Navigation />
      <Outlet />
    </>
  );
}
