import { G } from "../utils/constants";

export function Toast({ msg, warn }) {
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:300,
      background: warn ? G.danger : G.success,
      color:"#fff", padding:"10px 18px", borderRadius:8,
      fontSize:13, fontWeight:500,
      animation:"toastIn 0.3s ease",
      pointerEvents:"none",
    }}>{msg}</div>
  );
}
