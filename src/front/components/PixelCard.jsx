import React from "react";

const PixelCard = ({ title, author, image }) => {
    return (
        <div className="card h-100 shadow-sm" style={{ 
            borderRadius: "15px", 
            border: "2px solid #231B59",
            backgroundColor: "#ffffff",
            overflow: "hidden"
        }}>
            <div style={{ height: "250px", overflow: "hidden" }}>
                <img 
                    src={image || "https://via.placeholder.com/150"} 
                    className="card-img-top" 
                    alt={title}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
            </div>
            <div className="card-body d-flex flex-column justify-content-between">
                <div>
                    <h5 className="card-title fw-bold" style={{ color: "#231B59" }}>{title}</h5>
                    <p className="card-text text-muted small">{author}</p>
                </div>
            </div>
        </div>
    );
};

export default PixelCard;