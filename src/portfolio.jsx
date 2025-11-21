import React from "react";

const PortfolioButton = () => {
  return (
    <div style={{
      position: "absolute",
      top: "20px",
      right: "20px",
      zIndex: 9999
    }}>
      <a 
        href="https://msoaib10.github.io/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "#3b82f6",
          color: "white",
          padding: "10px 18px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "bold",
          fontSize: "15px",
          boxShadow: "0px 3px 8px rgba(0,0,0,0.2)"
        }}
      >
        My Portfolio
      </a>
    </div>
  );
};

export default PortfolioButton;