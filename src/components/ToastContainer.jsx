import React, { useEffect } from "react";

function ToastContainer({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

function Toast({ toast }) {
    const icons = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
    };

    return (
        <div className={`toast ${toast.type}`}>
            <span className="toast-icon">{icons[toast.type] || "ℹ️"}</span>
            <span className="toast-message">{toast.message}</span>
        </div>
    );
}

export default ToastContainer;
