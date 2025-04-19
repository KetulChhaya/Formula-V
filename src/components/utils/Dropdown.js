import React, { useState, useEffect } from "react";

// Generic Dropdown Component
const Dropdown = ({ options, selectedOption, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false); // State to control dropdown visibility
  const [rotateCaret, setRotateCaret] = useState(false); // State to control caret rotation

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    setRotateCaret(!rotateCaret);
  };

  const handleOptionClick = (option) => {
    onSelect(option); // Notify parent component about the selection
    setIsOpen(false);
    setRotateCaret(false);
  };

  const handleOutsideClick = (e) => {
    if (!e.target.closest("#dropdown")) {
      setIsOpen(false);
      setRotateCaret(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <div className="relative inline-block text-left" id="dropdown">
      <div>
        <button
          type="button"
          className="inline-flex justify-center items-center w-60 rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-yellow-500"
          aria-haspopup="true"
          aria-expanded={isOpen ? "true" : "false"}
          onClick={toggleDropdown}
        >
          <span className="w-full text-left overflow-hidden flex-1">
            {selectedOption || "Select an option"}
          </span>
          <svg
            className={`ml-2.5 -mr-1.5 h-5 w-5 transform transition-transform duration-200 ${
              rotateCaret ? "rotate-180" : "rotate-0"
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6.293 7.293a1 1 0 011.414 0L10 9.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute w-full left-0 mt-2 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none bg-slate-700 overflow-y-auto max-h-96"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="dropdown-button"
          tabIndex="-1"
        >
          <div className="py-1 text-white" role="none">
            {options.map((option, index) => (
              <a
                href="#"
                key={option.value}
                className="block px-4 py-2 text-left text-sm hover:bg-slate-600 focus:bg-slate-500"
                role="menuitem"
                onClick={() => handleOptionClick(option.value)}
              >
                {option.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
