import React, { useRef } from "react";
import ReactToPrint from "react-to-print";
import CustomButton from "./CustomButton";

// Assuming ComponentToPrint is imported or defined locally
export default function PrintButton({ componentToPrintRef }) {
  return (
    <div style={{ marginTop: '20px' }}>
      <ReactToPrint
        trigger={() => (
          <CustomButton
            buttonText="Print QR Code"
            backgroundColor="#4F5361"
          />
        )}
        content={() => componentToPrintRef.current}
      />
    </div>
  );
}