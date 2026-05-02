import { fmt } from "../utils/helpers";

export function Receipt({ order, discount, serviceType, note }) {
  const now = new Date();
  const sub = order.reduce((s,o) => s + o.price * o.qty, 0);
  const disc = Math.min(100, Math.max(0, parseFloat(discount) || 0));
  const discAmt = sub * disc / 100;
  const taxable = sub - discAmt;
  const tax = taxable * 0.1;
  const total = taxable + tax;
  const orderId = "HH-" + Math.floor(Math.random() * 9000 + 1000);

  return (
    <div style={{ background:"#fff", color:"#000000", borderRadius:8, padding:"6px 12px",
      fontFamily:"'Courier New',monospace", fontSize:12, fontWeight:700 }}>
      <div style={{ textAlign:"center", marginBottom:12, marginTop:0, paddingTop:0 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#000000" }}>HAPPY HOUR</div>
        <div style={{ fontSize:10, color:"#000000" }}>Restaurant &amp; Cafe</div>
        <div style={{ fontSize:10, color:"#000000" }}>417, Peradeniya Road, Kandy</div>
        <div style={{ fontSize:10, color:"#000000" }}>0774451516</div>
      </div>
      <hr style={{ border:"none", borderTop:"1px dashed #000000", margin:"8px 0" }} />
      {[["Order #", orderId], ["Order Type", serviceType],
        ["Date", now.toLocaleDateString("en-GB")],
        ["Time", now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})],
        ...(note ? [["Note", note]] : [])
      ].map(([k,v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
          <span>{k}</span><span>{v}</span>
        </div>
      ))}
      <hr style={{ border:"none", borderTop:"1px dashed #000000", margin:"8px 0" }} />
      <div style={{ fontWeight:"bold", marginBottom:6 }}>ITEMS</div>
      {order.map(o => (
        <div key={o.id} style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
          <span>{o.name} x{o.qty}</span>
          <span>Rs. {(o.price*o.qty).toLocaleString()}</span>
        </div>
      ))}
      <hr style={{ border:"none", borderTop:"1px dashed #000000", margin:"8px 0" }} />
      <div style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
        <span>Subtotal</span><span>{fmt(sub)}</span>
      </div>
      {disc > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
          <span>Discount ({disc}%)</span><span>-{fmt(discAmt)}</span>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", margin:"3px 0" }}>
        <span>Tax (10%)</span><span>{fmt(tax)}</span>
      </div>
      <hr style={{ border:"none", borderTop:"1px dashed #000000", margin:"8px 0" }} />
      <div style={{ display:"flex", justifyContent:"space-between", fontWeight:"bold", fontSize:14 }}>
        <span>TOTAL</span><span>{fmt(total)}</span>
      </div>
      <hr style={{ border:"none", borderTop:"1px dashed #000000", margin:"8px 0" }} />
      <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:"#000000" }}>
        Thank you for dining with us!<br/>Please visit again 🍹<br/>*All prices inclusive of service charge*
      </div>
      
      {/* Website QR Code Section */}
      <div style={{ textAlign: "center", marginTop: 15, marginBottom: 5 }}>
        <img 
          src="/1.png" 
          alt="Website QR Code" 
          style={{ width: "90px", height: "90px", display: "block", margin: "0 auto" }} 
        />
        <div style={{ marginTop: 6, fontSize: 11, color: "#000000", fontWeight: "bold" }}>
          Visit our website
        </div>
      </div>
    </div>
  );
}
