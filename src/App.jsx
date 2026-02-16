import React, { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import AgentsView from "./components/AgentsView";
import SchedulerView from "./components/SchedulerView";
import LogsView from "./components/LogsView";
import SettingsView from "./components/SettingsView";
import SandboxView from "./components/SandboxView";
import ToastContainer from "./components/ToastContainer";
import { AppProvider, useAppContext } from "./context/AppContext";

function AppContent() {
    const { activeView, toasts } = useAppContext();

    const renderView = () => {
        switch (activeView) {
            case "chat":
                return <ChatView />;
            case "agents":
                return <AgentsView />;
            case "scheduler":
                return <SchedulerView />;
            case "logs":
                return <LogsView />;
            case "settings":
                return <SettingsView />;
            case "sandbox":
                return <SandboxView />;
            default:
                return <ChatView />;
        }
    };

    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                {renderView()}
            </main>
            <ToastContainer toasts={toasts} />
        </div>
    );
}

function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

export default App;
