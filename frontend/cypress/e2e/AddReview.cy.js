describe("Add Review Flow", () => {
    beforeEach(() => {
      cy.login(); // Log in using a custom Cypress command before each test
  
      const testItemId = "valid-test-item-id";
  
      // Intercept item details
      cy.intercept("GET", `http://localhost:3000/home/get-item/${testItemId}`, {
        statusCode: 200,
        body: {
          id: testItemId,
          name: "Test Item",
          price: 1000,
          description: "Test product description",
          image: "test-image.jpg",
          category: "Test Category",
          user_id: "test-shop-id",
        },
      }).as("getItem");
  
      // Intercept wishlist
      cy.intercept("GET", "http://localhost:3000/api/wishlist/read", {
        statusCode: 200,
        body: [],
      }).as("getWishlist");
  
      // Mock API call for getting reviews (returns empty list)
      cy.intercept("GET", "http://localhost:3000/api/reviews/shop/*/product/*", {
        statusCode: 200,
        body: [],
      }).as("getReviews");
  
      // Visit the item detail page and wait for the item fetch request to complete
      cy.visit(`http://localhost:5173/client/dashboard/view-item/${testItemId}`);
      cy.wait("@getItem");
    });
  
    it("Submits a review successfully", () => {
      cy.intercept("POST", "http://localhost:3000/api/reviews/submit", {
        statusCode: 200,
        body: { success: true, message: "Review submitted successfully" },
      }).as("submitReview");
  
      cy.get("input[id=rating]").clear().type("4");
      cy.get("textarea[id=text]").type(
        "This is a test review from Cypress. The product quality is excellent!"
      );
  
      cy.contains("button", "Submit Review").click();
  
      cy.wait("@submitReview").then((interception) => {
        expect(interception.request.body).to.have.property("productId");
        expect(interception.request.body).to.have.property("rating");
        expect(interception.request.body)
          .to.have.property("text")
          .that.includes("test review");
        expect(interception.request.body).to.have.property("email");
      });
  
      cy.contains("Review added successfully").should("be.visible");
      cy.get("input[id=rating]").should("have.value", "1");
      cy.get("textarea[id=text]").should("have.value", "");
    });
  
    describe("Negative Test Cases", () => {
      it("Shows error when submitting without text", () => {
        cy.get("input[id=rating]").clear().type("5");
        cy.get("textarea[id=text]").clear();
  
        cy.contains("button", "Submit Review").click();
  
        cy.contains("Please fill in the review text").should("be.visible");
      });
  
      it("Shows error when not logged in", () => {
        cy.clearLocalStorage("user");
        cy.reload();
        cy.wait("@getItem");
  
        cy.get("input[id=rating]").clear().type("3");
        cy.get("textarea[id=text]").type(
          "This should not submit because I'm not logged in"
        );
  
        cy.contains("button", "Submit Review").click();
  
        cy.contains("You need to log in to submit a review").should("be.visible");
      });
  
      it("Shows error when server fails to submit review", () => {
        cy.intercept("POST", "http://localhost:3000/api/reviews/submit", {
          statusCode: 500,
          body: { error: "Internal Server Error" },
        }).as("submitReviewFail");
  
        cy.get("input[id=rating]").clear().type("4");
        cy.get("textarea[id=text]").type("Review that will fail to submit");
  
        cy.contains("button", "Submit Review").click();
        cy.wait("@submitReviewFail");
  
        cy.contains("Error submitting review").should("be.visible");
      });
    });
  });
  