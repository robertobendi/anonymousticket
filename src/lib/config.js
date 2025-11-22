/**
 * Website configuration and information
 * @type {{
 *   site: {
 *     name: string,
 *     description: string,
 *     author: string,
 *     links: {
 *       github: string,
 *       documentation: string
 *     }
 *   },
 *   navigation: {
 *     menu: Array<{
 *       label: string,
 *       path: string
 *     }>
 *   }
 * }}
 */
const websiteInfo = {
  site: {
    name: "SBB Anonymous Tickets",
    description: "Anonymous public transport tickets - No personal data required",
    author: "SBB CFF FFS",
    links: {
      github: "https://www.sbb.ch",
      documentation: "/docs"
    }
  },
  navigation: {
    menu: [
      {
        label: "Tickets",
        path: "/"
      },
      {
        label: "My Bookings",
        path: "/bookings"
      }
    ]
  }
};

// Freeze the object to prevent accidental modifications
Object.freeze(websiteInfo);
Object.freeze(websiteInfo.site);
Object.freeze(websiteInfo.site.links);
Object.freeze(websiteInfo.navigation);
Object.freeze(websiteInfo.navigation.menu);

export default websiteInfo;