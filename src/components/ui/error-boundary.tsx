
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`Error in ${this.props.componentName || "component"}:`, error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-[#222837] border-red-500/30 shadow-lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Component Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-[#2A3041] rounded-lg border border-red-500/20 text-sm">
              <p className="text-white/90 mb-2">
                {this.props.componentName 
                  ? `An error occurred in the ${this.props.componentName} component.` 
                  : "An error occurred while rendering this component."}
              </p>
              <p className="text-red-400 font-mono text-xs mt-2">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={this.handleReset}
              variant="outline" 
              className="border-red-500/20 hover:bg-red-500/10 text-white/90"
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}
