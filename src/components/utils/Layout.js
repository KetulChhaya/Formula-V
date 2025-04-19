import { Outlet } from "react-router-dom"; // To render nested routes
import { useEffect, useState } from "react";

const Layout = () => {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true); // Trigger the fade-in effect when the page loads
  }, []);

  return (
    <div
    //   className={`transition-opacity duration-1000 ${
    //     fadeIn ? "opacity-100" : "opacity-0"
    //   }`}
    >
      {/* Your common container structure */}
      <div className="max-w-8xl mx-auto px-6 py-4">
        {/* You can add a navbar here, logo, or anything else */}
        <div className=" p-6 rounded-lg">
          {/* Outlet will render the active route */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
