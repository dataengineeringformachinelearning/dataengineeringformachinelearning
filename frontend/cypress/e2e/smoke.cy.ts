/** Smoke tests for critical user flows — run against local dev or staging. */

describe('DEML app smoke', () => {
  it('loads the home/login route with visible shell', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.title().should('match', /DEML/i);
  });

  it('loads the status page with operational content', () => {
    cy.visit('/status');
    cy.contains(/status|uptime|operational/i).should('exist');
    cy.get('.page-inner-wrapper').should('exist');
  });

  it('loads the explore page for public status discovery', () => {
    cy.visit('/explore');
    cy.get('body').should('be.visible');
    cy.get('.page-inner-wrapper, .dashboard-page-container').should('exist');
  });

  it('loads the dashboard route shell', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
  });

  it('returns 404 shell for unknown routes', () => {
    cy.visit('/this-route-does-not-exist', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
  });
});

describe('Marketing site smoke', () => {
  const marketingUrl = Cypress.env('MARKETING_URL') || 'http://localhost:4321';

  it('loads marketing homepage when server is available', () => {
    cy.request({ url: marketingUrl, failOnStatusCode: false }).then(resp => {
      if (resp.status === 200) {
        cy.visit(marketingUrl);
        cy.title().should('match', /DEML/i);
      } else {
        cy.log('Marketing server not running — skipping live visit');
      }
    });
  });
});

describe('Viking-UI docs smoke', () => {
  const docsUrl = Cypress.env('VIKING_UI_DOCS_URL') || 'http://localhost:4300';

  it('loads docs landing and components route when server is available', () => {
    cy.request({ url: docsUrl, failOnStatusCode: false }).then(resp => {
      if (resp.status === 200) {
        cy.visit(docsUrl);
        cy.contains(/Stop fighting your component library/i).should('exist');
        cy.visit(`${docsUrl}/components`);
        cy.get('#cat-foundations').should('exist');
      } else {
        cy.log('Viking-UI docs server not running — skipping live visit');
      }
    });
  });
});
