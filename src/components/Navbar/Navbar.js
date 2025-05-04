import { useState } from "react";
import { FaArrowLeft, FaBars, FaX } from "react-icons/fa6";
import { GiF1Car } from "react-icons/gi";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key === "default") {
      navigate("/");
    } else {
      navigate(-1);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-red-800 to-black text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <button
            className="mr-4 transform transition duration-300 hover:scale-110"
            style={{visibility: location.pathname === "/" ? "hidden" : "visible"}}
            onClick={handleBack}
          >
            <FaArrowLeft size="1.5em" />
          </button>
          {/* Logo */}
          <Link to={"/"}>
            <div className="text-3xl font-[Formula1] text-white-700 flex items-center transform transition duration-300 hover:scale-105">
              Formula V   <GiF1Car size={"2.75em"} />
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
