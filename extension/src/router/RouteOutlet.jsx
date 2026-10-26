// Renders the page for the current hash location inside its layouts — the
// part of Next's App Router the web wallet relies on.
import React, {Component, Suspense, useSyncExternalStore} from 'react';
import {ErrorPage, NotFound} from '@generated/routes';
import {getSnapshot, subscribe} from './history';

export const useLocationSnapshot = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

// Next's error.jsx boundary, reset on navigation.
class RouteErrorBoundary extends Component {
  state = {error: null};

  static getDerivedStateFromError(error) {
    return {error};
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({error: null});
    }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorPage
          error={this.state.error}
          reset={() => this.setState({error: null})}
        />
      );
    }
    return this.props.children;
  }
}

export default function RouteOutlet() {
  const {route, pathname} = useLocationSnapshot();
  if (!route) {
    return <NotFound />;
  }
  const {Page, layouts} = route;
  const content = layouts.reduceRight(
    (children, Layout) => <Layout>{children}</Layout>,
    <Page />,
  );
  return (
    <RouteErrorBoundary resetKey={pathname}>
      {/* key: a new route id remounts, like a Next page change. */}
      <Suspense fallback={null} key={route.id}>
        {content}
      </Suspense>
    </RouteErrorBoundary>
  );
}
