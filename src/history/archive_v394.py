"""Evidence-backed station permutation recovery, archive only."""
from itertools import permutations
from urllib.parse import urlparse
from .archive_v393 import normalize_day, validate_candidate, signature, reconcile as reconcile_v393


def reconcile(ds, raw, candidates):
    # Keep existing successful cases identical.
    try:
        return reconcile_v393(ds, raw, candidates)
    except ValueError as exc:
        if str(exc) != 'raw/source tail or station mismatch' or raw is None or ds >= '2026-01-01':
            raise
    cs = [validate_candidate(c, ds) for c in candidates]
    hosts = [urlparse(c['source']['url']).hostname for c in cs]
    if len(hosts) < 2 or len(hosts) != len(set(hosts)):
        raise ValueError('fewer than two distinct usable sources')
    base = cs[0]['day']
    target = signature(base, True)
    if any(signature(c['day'], True) != target for c in cs):
        raise ValueError('source tail/station disagreement')
    obj, notes = normalize_day(raw, ds)
    original = signature(obj, True)
    # This is only a permutation, not a station addition/removal or number repair.
    if set(original) != set(target):
        raise ValueError('station set mismatch; manual review required')
    names = sorted(original)
    matches = [dict(zip(names, order)) for order in permutations(names)
               if all(original[a] == target[b] for a, b in zip(names, order))]
    if len(matches) != 1:
        raise ValueError('no unique station permutation; manual review required')
    mapping = matches[0]
    if all(a == b for a, b in mapping.items()):
        raise ValueError('station mapping did not resolve mismatch')
    for row in obj['draws']:
        row['station'] = mapping[row['station']]
    # Use source order, never assume alphabetical order is station 1.
    order = {r['station']: i for i, r in enumerate(base['draws'])}
    obj['draws'].sort(key=lambda r: order[r['station']])
    result = reconcile_v393(ds, obj, cs)
    result['normalizations'] = notes + result.get('normalizations', [])
    result['stationCorrection'] = {'rule': 'unique complete named prize-tail permutation',
                                    'mapping': mapping, 'sourceHosts': hosts,
                                    'rawFullMatchesAfterMapping': signature(obj) == signature(base)}
    return result
