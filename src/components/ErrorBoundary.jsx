import React from 'react';
import { Card, Button } from './ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary a intercepté une erreur : ", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-4">
          <Card className="max-w-md w-full text-center p-8">
            <div className="flex justify-center mb-4">
              <AlertTriangle size={48} className="text-warning" />
            </div>
            <h2 className="mb-4">Oups, un problème est survenu.</h2>
            <p className="text-slate-400 mb-6 text-sm">
              L'application a rencontré une erreur inattendue lors de l'affichage de cette page.
            </p>
            <Button 
              variant="primary" 
              className="w-full flex justify-center items-center gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} />
              Rafraîchir la page
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
