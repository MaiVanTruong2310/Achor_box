/// In-memory cache for the signed-in session, used to show the last known
/// data instantly while a fresh copy loads (stale-while-revalidate).
/// Never persisted; [SupabaseService.signOut] clears it.
abstract final class SessionCache {
  static final Map<String, Object> _store = {};

  static T? get<T extends Object>(String key) {
    final value = _store[key];
    return value is T ? value : null;
  }

  static void set(String key, Object value) => _store[key] = value;

  static void clear() => _store.clear();
}
