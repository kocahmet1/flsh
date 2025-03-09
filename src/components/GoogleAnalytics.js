
import React from 'react';
import { Text } from 'react-native';
import Constants from 'expo-constants';
import { Head } from 'expo-router';

export default function GoogleAnalytics() {
  const googleAnalyticsId = Constants.expoConfig?.web?.googleAnalyticsId;
  
  if (!googleAnalyticsId) {
    return null;
  }

  return (
    <Head>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `,
        }}
      />
    </Head>
  );
}
