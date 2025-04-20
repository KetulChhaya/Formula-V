import { useState } from "react";
import { FaBars, FaX } from "react-icons/fa6";
import { GiF1Car } from "react-icons/gi";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-red-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="text-3xl font-formula1 text-white-700 flex items-center">
          Formula V &nbsp; <GiF1Car size={"2.75em"} />
        </div>

        {/* Desktop Menu */}
        <ul className="hidden sm:flex space-x-8 text-lg">
          <li className="hover:text-white-100 cursor-pointer">
            <Link to={"/"}>Home</Link>
          </li>
          <li className="hover:text-white-100 cursor-pointer">
            <Link to={"/conversion-rates"}>Conversion Rates</Link>
          </li>
          <li className="hover:text-white-100 cursor-pointer">
            <Link to={"/constructor-dominance"}>Constructor Dominance</Link>
          </li>
          <li className="hover:text-white-100 cursor-pointer">
            <Link to={"/championship-battle-trends"}>Championship Battle Trends</Link>
          </li>
          <li className="hover:text-white-100 cursor-pointer">
            <Link to={"/qualifying-to-final-position"}>Qualifying to Final Position</Link>
          </li>{" "}
        </ul>

        {/* Hamburger Icon */}
        <div className="sm:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FaX size={28} /> : <FaBars size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <ul className="sm:hidden bg-black text-white flex flex-col space-y-4 px-6 pb-4">
          <li className="hover:text-white-400 cursor-pointer">Home</li>
          <li className="hover:text-white-400 cursor-pointer">Stats</li>
          <li className="hover:text-white-400 cursor-pointer">Drivers</li>
        </ul>
      )}
    </nav>
  );
}
