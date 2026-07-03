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

describe('Viking-UI showcase smoke', () => {
  it('loads showcase hero and foundations section', () => {
    cy.visit('http://localhost:4300', { failOnStatusCode: false });
    cy.get('.showcase-hero').should('exist');
    cy.get('#cat-foundations').should('exist');
  });
});
