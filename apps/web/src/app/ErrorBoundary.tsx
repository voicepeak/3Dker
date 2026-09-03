import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="crash">
          <h1>界面出错</h1>
          <p>{this.state.message}</p>
          <button onClick={() => this.setState({ message: undefined })}>继续</button>
        </div>
      );
    }
    return this.props.children;
  }
}
