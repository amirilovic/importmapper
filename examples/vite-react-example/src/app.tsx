import { HelmetProvider } from "react-helmet-async";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/layout";
import { ErrorPage } from "./pages/error-page";
import { HomePage } from "./pages/home-page";
import { ChakraProvider } from "@chakra-ui/react";

const router = createBrowserRouter([
  {
    path: `${import.meta.env.BASE_URL}/`,
    errorElement: <ErrorPage />,
    element: <Layout />,
    children: [
      {
        path: `${import.meta.env.BASE_URL}/`,
        element: <HomePage />,
      },
    ],
  },
]);

export function App() {
  return (
    <HelmetProvider>
      <ChakraProvider>
        <RouterProvider router={router} />
      </ChakraProvider>
    </HelmetProvider>
  );
}
