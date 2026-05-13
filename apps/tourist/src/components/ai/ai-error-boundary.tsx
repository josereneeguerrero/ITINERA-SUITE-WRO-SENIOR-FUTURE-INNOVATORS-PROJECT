"use client";

import React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error?: string }

export class AIErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => this.setState({ hasError: false })}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-lg"
            style={{ backgroundColor: "#0D9488" }}
            title="Reiniciar Itinera IA"
          >
            ✨
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
