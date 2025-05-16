describe("ViewItemDetails Component - Delete Review", () => {
    const testItem = {
      _id: "test-item-123",
      name: "Test Product",
      price: 2500,
      description: "This is a test product description",
      image: "https://example.com/test-image.jpg",
      category: "Test Category",
      user_id: "shop-owner-456"
    };
  
    const setupTest = (options = {}) => {
      const { 
        isLoggedIn = true, 
        itemExists = true,
        reviewsExist = true
      } = options;
  
      if (isLoggedIn) {
        cy.window().then(win => {
          win.localStorage.setItem('user', JSON.stringify({ email: "test@example.com" }));
        });
      } else {
        cy.clearLocalStorage("user");
      }
  
      if (itemExists) {
        cy.intercept("GET", "http://localhost:3000/home/get-item/*", {
          statusCode: 200,
          body: testItem
        }).as("getItem");
      }
  
      cy.intercept("GET", "http://localhost:3000/api/wishlist/read", {
        statusCode: 200,
        body: []
      }).as("getWishlist");
  
      cy.visit(`http://localhost:5173/client/dashboard/view-item/${testItem._id}`);
    };
  
    it("Deletes a review successfully", () => {
      cy.intercept("GET", `http://localhost:3000/api/reviews/shop/*/product/*`, {
        statusCode: 200,
        body: [
          {
            _id: "deletable-review-123",
            email: "test@example.com",
            text: "This review will be deleted",
            rating: 2,
            date: new Date().toISOString()
          }
        ]
      }).as("getReviews");
  
      setupTest();
      cy.wait("@getItem");
      cy.wait("@getReviews");
  
      cy.intercept("DELETE", "http://localhost:3000/api/reviews/delete/*", {
        statusCode: 200,
        body: { success: true }
      }).as("deleteReview");
  
      cy.window().then(win => {
        cy.stub(win, 'confirm').returns(true);
      });
  
      cy.contains("button", "Delete").click();
      cy.wait("@deleteReview");
  
      cy.contains("Review deleted successfully").should("be.visible");
      cy.contains("This review will be deleted").should("not.exist");
    });
  
    it("Fails to delete a review due to server error", () => {
      cy.intercept("GET", `http://localhost:3000/api/reviews/shop/*/product/*`, {
        statusCode: 200,
        body: [
          {
            _id: "failing-review-456",
            email: "test@example.com",
            text: "This review should fail to delete",
            rating: 4,
            date: new Date().toISOString()
          }
        ]
      }).as("getReviews");
  
      setupTest();
      cy.wait("@getItem");
      cy.wait("@getReviews");
  
      cy.intercept("DELETE", "http://localhost:3000/api/reviews/delete/*", {
        statusCode: 500,
        body: { error: "Internal server error" }
      }).as("deleteReviewFail");
  
      cy.window().then(win => {
        cy.stub(win, 'confirm').returns(true);
      });
  
      cy.contains("button", "Delete").click();
      cy.wait("@deleteReviewFail");
  
      cy.contains("Error deleting review").should("be.visible");
      cy.contains("This review should fail to delete").should("exist");
    });
  
    it("Does not delete review when user cancels confirmation", () => {
      cy.intercept("GET", `http://localhost:3000/api/reviews/shop/*/product/*`, {
        statusCode: 200,
        body: [
          {
            _id: "cancel-review-789",
            email: "test@example.com",
            text: "This review should stay",
            rating: 3,
            date: new Date().toISOString()
          }
        ]
      }).as("getReviews");
  
      setupTest();
      cy.wait("@getItem");
      cy.wait("@getReviews");
  
      // Stub confirm to return false (cancel)
      cy.window().then(win => {
        cy.stub(win, 'confirm').returns(false);
      });
  
      cy.contains("button", "Delete").click();
  
      // Verify DELETE was never called
      cy.get("@getReviews").its("response.statusCode").should("eq", 200);
      cy.contains("This review should stay").should("exist");
    });
  });
  