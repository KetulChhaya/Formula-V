import logo from "./logo.svg";
import "./App.css";
import Viz1 from "./components/viz1/Viz1";
import Viz2 from "./components/viz2/Viz2";
import ConversionRates from "./components/conversion-rates/conversion-rates";
import ConstructorDominance from "./components/constructor-dominance/constructor-dominance";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <nav>
        <a href="/">Driver Journey Map</a> |{" "}
        <a href="/sankey">Qualifying vs Race Flow</a> |{" "}
        <a href="/conversion-rates">Conversion Rates</a> |{" "}
        <a href="/constructor-dominance">Constructor Dominance</a>
      </nav>
      <Router>
        <Routes>
          <Route path="/" element={<Viz1 />} />
          <Route path="/sankey" element={<Viz2 />} />
          <Route path="/conversion-rates" element={<ConversionRates />} />
          <Route path="/constructor-dominance" element={<ConstructorDominance />}
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
