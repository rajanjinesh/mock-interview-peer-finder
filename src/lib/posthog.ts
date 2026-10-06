import posthog from 'posthog-js';

let isInitialized = false;

export const initPostHog = () => {
  if (typeof window === 'undefined') return;
  if (isInitialized || posthog.__loaded) {
    isInitialized = true;
    return;
  }

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      loaded: () => {
        isInitialized = true;
      },
    });
    isInitialized = true;
  }
};

export const capturePostHogEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  if (!isInitialized && !posthog.__loaded) {
    initPostHog();
  }

  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.error(`PostHog capture error for event '${eventName}':`, err);
  }
};

export const isPostHogFeatureEnabled = (flagKey: string): boolean => {
  if (typeof window === 'undefined') return false;

  if (!isInitialized && !posthog.__loaded) {
    initPostHog();
  }

  try {
    return Boolean(posthog.isFeatureEnabled(flagKey));
  } catch (err) {
    console.error(`PostHog feature flag evaluation error for '${flagKey}':`, err);
    return false;
  }
};

export const onPostHogFeatureFlags = (callback: () => void) => {
  if (typeof window === 'undefined') return;

  if (!isInitialized && !posthog.__loaded) {
    initPostHog();
  }

  try {
    return posthog.onFeatureFlags(callback);
  } catch (err) {
    console.error('PostHog feature flags listener error:', err);
  }
};
