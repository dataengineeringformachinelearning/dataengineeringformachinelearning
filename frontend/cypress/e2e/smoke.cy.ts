/** Smoke tests for critical user flows — run against local dev or staging. */

describe('DEML app smoke', () => {
  it('loads the home/dashboard route', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  it('loads the status page', () => {
    cy.visit('/status');
    cy.contains(/status|uptime|operational/i).should('exist');
  });

  it('loads the explore page', () => {
    cy.visit('/explore');
    cy.get('body').should('be.visible');
  });
});

describe('Viking-UI docs smoke', () => {
  it('loads docs landing and components route', () => {
    cy.visit('http://localhost:4300', { failOnStatusCode: false });
    cy.contains(/Stop fighting your component library/i).should('exist');
    cy.visit('http://localhost:4300/components', { failOnStatusCode: false });
    cy.get('#cat-foundations').should('exist');
  });
});
