import React from "react";
import useCaptureVM from "../ViewModel/useCaptureVM"; // adjust path
import CaptureScreen from "../View/CaptureScreen";     // adjust path

const CaptureScreenContainer = (props) => {
  const vm = useCaptureVM();          // 1) create the view model
  return <CaptureScreen {...props} vm={vm} />;  // 2) pass it as prop
};

export default CaptureScreenContainer;
