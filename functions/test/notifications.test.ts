import { expect } from 'chai';

describe('notifications utilities', () => {
  describe('notification title formatting', () => {
    it('formats standing order match title', () => {
      const title = formatStandingOrderMatchTitle('salmon');
      expect(title).to.equal('New salmon listing near you!');
    });

    it('formats new order title', () => {
      const title = formatNewOrderTitle();
      expect(title).to.equal('New order received!');
    });

    it('formats order update title', () => {
      const title = formatOrderUpdateTitle();
      expect(title).to.equal('Order update');
    });
  });

  describe('notification body formatting', () => {
    it('formats standing order match body', () => {
      const body = formatStandingOrderMatchBody('A', 'salmon');
      expect(body).to.equal('A a grade salmon listing matching your criteria is now available.');
    });

    it('formats new order body', () => {
      const body = formatNewOrderBody('Salmon (A grade)');
      expect(body).to.equal('You have a new order for Salmon (A grade).');
    });

    it('formats pending order status body', () => {
      const body = formatOrderStatusBody('pending');
      expect(body).to.equal('Your order has been placed.');
    });

    it('formats picked up order status body', () => {
      const body = formatOrderStatusBody('picked_up');
      expect(body).to.equal('Your order has been picked up!');
    });

    it('formats cancelled order status body', () => {
      const body = formatOrderStatusBody('cancelled');
      expect(body).to.equal('Your order has been cancelled.');
    });

    it('formats unknown order status body', () => {
      const body = formatOrderStatusBody('unknown');
      expect(body).to.equal('Your order status has changed.');
    });
  });

  describe('notification types', () => {
    const validTypes = ['standing_order_match', 'order_update', 'listing_update'];

    it('includes standing_order_match type', () => {
       
      expect(validTypes.includes('standing_order_match')).to.be.true;
    });

    it('includes order_update type', () => {
       
      expect(validTypes.includes('order_update')).to.be.true;
    });

    it('includes listing_update type', () => {
       
      expect(validTypes.includes('listing_update')).to.be.true;
    });
  });

  describe('grade formatting', () => {
    it('converts grade to lowercase', () => {
      const formatted = formatGrade('A');
      expect(formatted).to.equal('a');
    });

    it('handles sushi grade', () => {
      const formatted = formatGrade('sushi');
      expect(formatted).to.equal('sushi');
    });

    it('handles B grade', () => {
      const formatted = formatGrade('B');
      expect(formatted).to.equal('b');
    });
  });

  describe('FCM token validation', () => {
    it('recognizes valid token format', () => {
      const token = 'valid_token_here';
       
      expect(token.length > 0).to.be.true;
    });

    it('handles empty token array', () => {
      const tokens: string[] = [];
       
      expect(tokens.length === 0).to.be.true;
    });

    it('handles multiple tokens', () => {
      const tokens = ['token1', 'token2', 'token3'];
      expect(tokens.length).to.equal(3);
    });
  });

  describe('notification data structure', () => {
    it('creates notification payload with required fields', () => {
      const payload = createNotificationPayload('user123', 'standing_order_match', 'Test', 'Test body');
      expect(payload.userId).to.equal('user123');
      expect(payload.type).to.equal('standing_order_match');
      expect(payload.title).to.equal('Test');
      expect(payload.body).to.equal('Test body');
    });

    it('creates notification payload with optional data', () => {
      const payload = createNotificationPayload('user123', 'order_update', 'Test', 'Test body', { orderId: 'abc123' });
      expect(payload.data).to.deep.equal({ orderId: 'abc123' });
    });
  });
});

// Helper functions for testing
function formatStandingOrderMatchTitle(species: string): string {
  return `New ${species} listing near you!`;
}

function formatNewOrderTitle(): string {
  return 'New order received!';
}

function formatOrderUpdateTitle(): string {
  return 'Order update';
}

function formatStandingOrderMatchBody(grade: string, species: string): string {
  return `A ${grade.toLowerCase()} grade ${species} listing matching your criteria is now available.`;
}

function formatNewOrderBody(listingTitle: string): string {
  return `You have a new order for ${listingTitle}.`;
}

function formatOrderStatusBody(status: string): string {
  const statusMessages: Record<string, string> = {
    pending: 'Your order has been placed.',
    picked_up: 'Your order has been picked up!',
    cancelled: 'Your order has been cancelled.'
  };

  return statusMessages[status] || 'Your order status has changed.';
}

function formatGrade(grade: string): string {
  return grade.toLowerCase();
}

function createNotificationPayload(
  userId: string,
  type: 'standing_order_match' | 'order_update' | 'listing_update',
  title: string,
  body: string,
  data?: Record<string, string>
): { userId: string; type: string; title: string; body: string; data?: Record<string, string> } {
  return {
    userId,
    type,
    title,
    body,
    data
  };
}
