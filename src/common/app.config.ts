/**
 * Application Identity (Brand)
 *
 * Also note that the 'Brand' is used in the following places:
 *  - README.md               all over
 *  - package.json            app-slug and version
 *  - [public/manifest.json]  name, short_name, description, theme_color, background_color
 */
export const Brand = {
  Title: {
    Base: 'ABOV3',
    Common: 'ABOV3 Exodus',
  },
  Meta: {
    Description: 'ABOV3 Exodus - Advanced AI workspace for multi-model reasoning, coding, and research. Built on cutting-edge AI technology with full control over your data.',
    SiteName: 'ABOV3 Exodus | Advanced AI Workspace',
    ThemeColor: '#32383E',
    TwitterSite: '@abov3genesis',
  },
  URIs: {
    Home: 'https://abov3.com',
    // App: 'https://get.abov3.com',
    CardImage: 'https://abov3.com/icons/card-dark-1200.png',
    // OpenRepo: 'https://github.com/abov3-genesis/abov3-exodus',  // Not ready yet
    // OpenProject: 'https://github.com/users/abov3-genesis/projects/1',  // Not ready yet
    // SupportInvite: 'https://discord.gg/abov3',  // Not ready yet
    // Twitter: 'https://www.twitter.com/abov3genesis',
    PrivacyPolicy: 'https://abov3.com/privacy',
    TermsOfService: 'https://abov3.com/terms',
  },
  Docs: {
    Public: (docPage: string) => `https://abov3.com/docs/${docPage}`,
  }
} as const;