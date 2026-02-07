/// MockDeepBook — Simulated CLOB orderbook for DeepGrid MVP.
///
/// Stores orders as Sui objects inside a shared OrderBook.
/// Supports: place_order, cancel_all, simulate_trade (deterministic fills),
/// and settle_fills. Same interface can evolve to wrap real DeepBook.
///
/// Orders are stored in vectors (MVP — not dynamic fields) for simplicity.
module deepgrid::mock_deepbook {
    use sui::event;

    // ======== Error codes ========
    const EInvalidSide: u64 = 200;
    const ENoOrders: u64 = 201;
    const EOrderBookMismatch: u64 = 202;

    // ======== Constants ========
    /// Side::Bid = 0, Side::Ask = 1
    const BID: u8 = 0;
    const ASK: u8 = 1;

    // ======== Objects ========

    /// A single order on the mock book.
    public struct Order has store, copy, drop {
        order_id: u64,
        side: u8,       // 0 = bid, 1 = ask
        price: u64,     // price in quote units per base unit (scaled 1e9)
        size: u64,      // size in base units
        vault_id: ID,   // which vault placed this order
        filled: u64,    // how much has been filled
    }

    /// The mock orderbook — shared object.
    public struct OrderBook has key {
        id: UID,
        bids: vector<Order>,
        asks: vector<Order>,
        next_order_id: u64,
        /// Current mid price (mock oracle built-in for simplicity).
        mid_price: u64,
        /// Accumulated fills ready to settle (quote amount earned from spread).
        pending_fill_quote: u64,
        /// Accumulated fills in base returned from asks.
        pending_fill_base: u64,
    }

    // ======== Events ========

    public struct OrderPlaced has copy, drop {
        order_id: u64,
        side: u8,
        price: u64,
        size: u64,
        vault_id: ID,
    }

    public struct OrdersCancelled has copy, drop {
        vault_id: ID,
        count: u64,
    }

    public struct TradeSimulated has copy, drop {
        old_mid: u64,
        new_mid: u64,
        bid_fills: u64,
        ask_fills: u64,
        quote_earned: u64,
    }

    // ======== Constructor ========

    /// Create a new mock orderbook with an initial mid price.
    public fun create_orderbook(initial_mid_price: u64, ctx: &mut TxContext): ID {
        let book = OrderBook {
            id: object::new(ctx),
            bids: vector::empty(),
            asks: vector::empty(),
            next_order_id: 1,
            mid_price: initial_mid_price,
            pending_fill_quote: 0,
            pending_fill_base: 0,
        };
        let book_id = object::id(&book);
        transfer::share_object(book);
        book_id
    }

    /// Entry wrapper.
    entry fun create_orderbook_entry(initial_mid_price: u64, ctx: &mut TxContext) {
        create_orderbook(initial_mid_price, ctx);
    }

    // ======== Order Management ========

    /// Place an order on the book (called by strategy module).
    public fun place_order(
        book: &mut OrderBook,
        side: u8,
        price: u64,
        size: u64,
        vault_id: ID,
    ): u64 {
        assert!(side == BID || side == ASK, EInvalidSide);

        let order_id = book.next_order_id;
        book.next_order_id = book.next_order_id + 1;

        let order = Order {
            order_id,
            side,
            price,
            size,
            vault_id,
            filled: 0,
        };

        if (side == BID) {
            book.bids.push_back(order);
        } else {
            book.asks.push_back(order);
        };

        event::emit(OrderPlaced { order_id, side, price, size, vault_id });
        order_id
    }

    /// Cancel all orders for a given vault.
    public fun cancel_all(book: &mut OrderBook, vault_id: ID): (u64, u64) {
        let mut cancelled = 0u64;

        // Cancel bids — rebuild vector without matching orders
        let mut new_bids = vector::empty<Order>();
        let mut i = 0;
        let len = book.bids.length();
        while (i < len) {
            let order = book.bids[i];
            if (order.vault_id != vault_id) {
                new_bids.push_back(order);
            } else {
                cancelled = cancelled + 1;
            };
            i = i + 1;
        };
        book.bids = new_bids;

        // Cancel asks
        let mut new_asks = vector::empty<Order>();
        i = 0;
        let len = book.asks.length();
        while (i < len) {
            let order = book.asks[i];
            if (order.vault_id != vault_id) {
                new_asks.push_back(order);
            } else {
                cancelled = cancelled + 1;
            };
            i = i + 1;
        };
        book.asks = new_asks;

        // Return (cancelled_count, 0) — second value reserved for locked amount calc
        let locked_quote_freed = 0u64; // simplified
        event::emit(OrdersCancelled { vault_id, count: cancelled });
        (cancelled, locked_quote_freed)
    }

    /// Simulate a trade: move mid price and fill crossing orders.
    ///
    /// `price_delta` is signed as u64 with a bool `price_up`.
    /// If price goes UP: asks get filled (vault sold base at ask price → earned quote).
    /// If price goes DOWN: bids get filled (vault bought base at bid price → spent quote).
    ///
    /// For MVP: we fill ALL crossing orders fully.
    public fun simulate_trade(
        book: &mut OrderBook,
        price_up: bool,
        price_delta: u64,
    ) {
        let old_mid = book.mid_price;
        let new_mid = if (price_up) {
            old_mid + price_delta
        } else {
            if (price_delta > old_mid) { 1 } else { old_mid - price_delta }
        };
        book.mid_price = new_mid;

        let mut bid_fills = 0u64;
        let mut ask_fills = 0u64;
        let mut quote_earned = 0u64;

        if (price_up) {
            // Price went up → asks get filled (we sold base above old mid)
            let mut new_asks = vector::empty<Order>();
            let mut i = 0;
            let len = book.asks.length();
            while (i < len) {
                let mut order = book.asks[i];
                if (order.price <= new_mid) {
                    // Filled! Vault sold `size` base at `price` → earned size * price / 1e9 quote
                    let fill_size = order.size - order.filled;
                    let fill_quote = (fill_size as u128) * (order.price as u128) / 1_000_000_000;
                    quote_earned = quote_earned + (fill_quote as u64);
                    book.pending_fill_quote = book.pending_fill_quote + (fill_quote as u64);
                    ask_fills = ask_fills + fill_size;
                    order.filled = order.size;
                    // Don't keep fully filled orders
                } else {
                    new_asks.push_back(order);
                };
                i = i + 1;
            };
            book.asks = new_asks;
        } else {
            // Price went down → bids get filled (we bought base below old mid)
            let mut new_bids = vector::empty<Order>();
            let mut i = 0;
            let len = book.bids.length();
            while (i < len) {
                let mut order = book.bids[i];
                if (order.price >= new_mid) {
                    // Filled! Vault bought `size` base at `price`
                    let fill_size = order.size - order.filled;
                    book.pending_fill_base = book.pending_fill_base + fill_size;
                    bid_fills = bid_fills + fill_size;
                    order.filled = order.size;
                } else {
                    new_bids.push_back(order);
                };
                i = i + 1;
            };
            book.bids = new_bids;
        };

        event::emit(TradeSimulated {
            old_mid,
            new_mid,
            bid_fills,
            ask_fills,
            quote_earned,
        });
    }

    // ======== Accessors ========

    public fun mid_price(book: &OrderBook): u64 { book.mid_price }
    public fun pending_fill_quote(book: &OrderBook): u64 { book.pending_fill_quote }
    public fun pending_fill_base(book: &OrderBook): u64 { book.pending_fill_base }
    public fun bid_count(book: &OrderBook): u64 { book.bids.length() }
    public fun ask_count(book: &OrderBook): u64 { book.asks.length() }

    /// Consume pending fills (called by strategy::settle).
    public(package) fun take_pending_fills(book: &mut OrderBook): (u64, u64) {
        let base = book.pending_fill_base;
        let quote = book.pending_fill_quote;
        book.pending_fill_base = 0;
        book.pending_fill_quote = 0;
        (base, quote)
    }

    /// Set mid price (for oracle mock updates).
    public(package) fun set_mid_price(book: &mut OrderBook, price: u64) {
        book.mid_price = price;
    }
}
