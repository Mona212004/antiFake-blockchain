import { Button, styled } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";

// Styled component using Transient Props ($) to avoid HTML attribute warnings
const StyledBtn = styled(Button)(({ theme, $bgColor, $textColor }) => ({
  backgroundColor: $bgColor || "#0F1B4C",
  color: $textColor || "#fff",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
  padding: "0.5rem 1.25rem",
  borderRadius: "7px",
  textTransform: "none",
  border: "2px solid transparent",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: $textColor || "#fff",
    color: $bgColor || "#0F1B4C",
    borderColor: $bgColor || "#0F1B4C",
  },
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));

const CustomButton = ({ backgroundColor, color, buttonText, onClick, to, type = "button" }) => {
  const content = (
    <StyledBtn
      onClick={onClick}
      $bgColor={backgroundColor}
      $textColor={color}
      type={type}
    >
      {buttonText}
    </StyledBtn>
  );

  // Use 'to' prop for internal navigation (replacing LinkButton.js logic)
  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  return content;
};

export default CustomButton;