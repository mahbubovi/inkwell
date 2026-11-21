import { Component } from 'react';

// Catches rendering errors so a bug shows a friendly screen instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-serif text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-mute">An unexpected error occurred. Reloading usually fixes it.</p>
        <button className="btn btn-p mt-6" onClick={() => window.location.assign('/')}>Reload the app</button>
      </section>
    );
  }
}
