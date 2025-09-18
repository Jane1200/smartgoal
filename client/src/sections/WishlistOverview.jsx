export default function WishlistOverview() {
  // Placeholder list; replace with live wishlist later
  const items = [
    { id: 1, title: "MacBook Air", price: 999, drop: "-3%" },
    { id: 2, title: "Sony WH-1000XM5", price: 348, drop: "-5%" },
    { id: 3, title: "Kindle Paperwhite", price: 129, drop: "-2%" },
  ];

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">Smart Wishlist</h5>
          <button className="btn btn-sm btn-outline-primary">View Wishlist</button>
        </div>
        <div className="list-group">
          {items.map((i) => (
            <div className="list-group-item d-flex justify-content-between" key={i.id}>
              <div>{i.title}</div>
              <div className="text-muted small">${i.price} · {i.drop}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




