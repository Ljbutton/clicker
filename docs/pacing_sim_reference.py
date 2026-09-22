#!/usr/bin/env python3
"""Pacing sim v2: crew-scaled workshops priced in Sap (foreman = 25 hand-crafted units), Compass-driven bot."""
import math, sys, json

WORTH = dict(sap=1,bark=2,stone=3,fiber=4,honey=12,ore=20,starfall=2000,
  resin=20,plank=24,beam=480,brick=120,glass=210,cord=64,lacquer=480,ingot=1400,lantern=4000,clockwork=20000,amber=2400,starglass=65000)
RAW = ['sap','bark','stone','fiber','honey','ore','starfall']
LODGES = {
 'sapper':    dict(res='sap',   rate=0.5,  cost=15, cres='sap',   growth=1.13),
 'peeler':    dict(res='bark',  rate=0.4,  cost=60, cres='sap',   growth=1.13),
 'digger':    dict(res='stone', rate=0.3,  cost=6,  cres='resin', growth=1.13),
 'weaver':    dict(res='fiber', rate=0.25, cost=10, cres='plank', growth=1.13),
 'beekeeper': dict(res='honey', rate=0.1,  cost=5,  cres='cord',  growth=1.13),
 'miner':     dict(res='ore',   rate=0.2,  cost=4,  cres='beam',  growth=1.13),
}
LODGE_OF = {L['res']: k for k, L in LODGES.items()}
WS = {  # one recipe each; t = seconds per craft per crew member; crew cost in Sap = cbase * 1.15^n (n>=1); crew #1 (foreman) = `foreman` units of output
 'kiln':       dict(out='resin',   inp={'sap':5},                      t=4,  build={'sap':40},              foreman=25, cbase=30,   tier=1),
 'sawmill':    dict(out='plank',   inp={'bark':3},                     t=5,  build={'bark':30},             foreman=25, cbase=30,   tier=1),
 'brickyard':  dict(out='brick',   inp={'stone':3,'resin':1},          t=6,  build={'resin':20,'stone':20}, foreman=25, cbase=150,  tier=1),
 'ropewalk':   dict(out='cord',    inp={'fiber':4},                    t=5,  build={'plank':20},            foreman=25, cbase=150,  tier=1),
 'beamworks':  dict(out='beam',    inp={'plank':4,'resin':1},          t=12, build={'plank':30,'resin':10}, foreman=15, cbase=150,  tier=2),
 'glasshouse': dict(out='glass',   inp={'stone':4,'resin':2},          t=10, build={'brick':15},            foreman=15, cbase=800,  tier=2),
 'lacquery':   dict(out='lacquer', inp={'resin':2,'cord':1,'honey':1}, t=12, build={'beam':10,'brick':5},   foreman=15, cbase=800,  tier=2),
 'forge':      dict(out='ingot',   inp={'ore':5,'brick':2},            t=15, build={'beam':30,'brick':20},  foreman=15, cbase=5000, tier=2),
 'lanternry':  dict(out='lantern', inp={'glass':2,'lacquer':1,'cord':1},t=20,build={'beam':20,'glass':10},  foreman=10, cbase=5000, tier=3),
}
WS_ORDER = ['kiln','sawmill','brickyard','ropewalk','beamworks','glasshouse','lacquery','forge','lanternry']
WS_OF = {W['out']: k for k, W in WS.items()}
RUNE_GROWTH = float(sys.argv[6]) if len(sys.argv) > 6 else 6.0
RUNE_RAW_MULT = float(sys.argv[7]) if len(sys.argv) > 7 else 1.5
RUNES = {
 'runeSap':   dict(good='resin',   base=10, mult=RUNE_RAW_MULT, target='sap'),
 'runeBark':  dict(good='plank',   base=10, mult=RUNE_RAW_MULT, target='bark'),
 'runeStone': dict(good='brick',   base=10, mult=RUNE_RAW_MULT, target='stone'),
 'runeFiber': dict(good='cord',    base=10, mult=RUNE_RAW_MULT, target='fiber'),
 'runeHive':  dict(good='lacquer', base=5,  mult=RUNE_RAW_MULT, target='honey'),
 'runeOre':   dict(good='ingot',   base=5,  mult=RUNE_RAW_MULT, target='ore'),
 'bell':      dict(good='beam',    base=10, mult=1.5, target='craft'),
 'runeThrum': dict(good='glass',   base=10, mult=2.0, target='tap'),
 'runeRoots': dict(good='lantern', base=5,  mult=1.5, target='allraw'),
}
RITUALS = { 2: dict(h=30,  cost={'plank':40,'resin':20}),
            3: dict(h=60,  cost={'plank':200,'beam':40}),
            4: dict(h=200, cost={'beam':300,'brick':150,'glass':60}),
            5: dict(h=400, cost={'beam':1000,'glass':300,'lacquer':150}),
            6: dict(h=800, cost={'lantern':2000,'ingot':500,'lacquer':1000}) }
GROW_BASE = float(sys.argv[3]) if len(sys.argv) > 3 else 10
GROW_G = float(sys.argv[4]) if len(sys.argv) > 4 else 1.18
TAP_RATE = 3.0
TAP_PEG = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
FEED = 0.5
RING_K = float(sys.argv[5]) if len(sys.argv) > 5 else 1e5
MINUTES = int(sys.argv[2]) if len(sys.argv) > 2 else 90

def ms(level):
    m = 1.0
    if level >= 10: m *= 1.5
    for t in (25,50,100,200):
        if level >= t: m *= 2
    if level >= 300: m *= 2 ** ((level-200)//100)
    return m

class S:
    def __init__(s):
        s.res = {k:0.0 for k in WORTH}
        s.lodge = {k:0 for k in LODGES}
        s.ws = {k:dict(built=False, crew=0, handcrafts=0) for k in WS}
        s.rune = {k:0 for k in RUNES}
        s.bough = 1; s.grows = 0; s.height = 0.0
        s.hw = 0.0; s.t = 0.0; s.taps = 0
        s.gross = {k:0.0 for k in WORTH}; s.cons = {k:0.0 for k in WORTH}
        s.branch = 0; s.log = []; s.spent_grow = 0.0

def lodge_cost(s, id): L = LODGES[id]; return L['cost'] * L['growth'] ** s.lodge[id]
def rune_cost(s, id): R = RUNES[id]; return R['base'] * RUNE_GROWTH ** s.rune[id]
def rune_mult(s, target):
    m = 1.0
    for k, R in RUNES.items():
        if R['target'] == target: m *= R['mult'] ** s.rune[k]
    return m
def crew_cost(s, id):  # cost of the NEXT crew member (crew>=1) in Sap
    return WS[id]['cbase'] * 1.15 ** (s.ws[id]['crew'] - 1)
def ws_capacity(s, id):
    w = s.ws[id]; W = WS[id]
    return w['crew'] * (1.0 / W['t']) * ms(w['crew']) * rune_mult(s, 'craft')
def grow_cost(s): return GROW_BASE * GROW_G ** s.grows
def grow_m(s): return 1 + s.grows / 4
def raw_rate(s, id):
    L = LODGES[id]; n = s.lodge[id]
    return n * L['rate'] * ms(n) * rune_mult(s, L['res']) * rune_mult(s, 'allraw')
def idle_sap(s): return raw_rate(s, 'sapper')
def rings(s):
    if s.hw <= RING_K: return 0
    return int(2 * (math.log10(s.hw / RING_K)) ** 1.5)
def afford(s, cost): return all(s.res[k] >= v for k, v in cost.items())
def pay(s, cost):
    for k, v in cost.items(): s.res[k] -= v

def step(s, dt, tapping):
    gross = {k:0.0 for k in WORTH}; cons = {k:0.0 for k in WORTH}
    for id, L in LODGES.items():
        if s.lodge[id] == 0: continue
        r = raw_rate(s, id)
        s.res[L['res']] += r * dt; gross[L['res']] += r; s.hw += r * WORTH[L['res']] * dt
    if tapping:
        taps = TAP_RATE * dt
        val = max(1.0, TAP_PEG * idle_sap(s)) * 1.9 * rune_mult(s, 'tap')
        s.res['sap'] += taps * val; s.hw += taps * val; s.taps += taps
    for id in WS_ORDER:
        w = s.ws[id]; W = WS[id]
        if not (w['built'] and w['crew'] > 0): continue
        crafts = ws_capacity(s, id) * dt
        for r, n in W['inp'].items():
            allowed = min(s.res[r], FEED * gross[r] * dt)
            crafts = min(crafts, allowed / n)
        if crafts <= 0: continue
        for r, n in W['inp'].items(): s.res[r] -= crafts * n; cons[r] += crafts * n / dt
        s.res[W['out']] += crafts; gross[W['out']] += crafts / dt; s.hw += crafts * WORTH[W['out']]
    s.gross = gross; s.cons = cons; s.t += dt

def handcraft(s, id, n):
    W = WS[id]; done = 0
    for _ in range(n):
        if afford(s, W['inp']):
            pay(s, W['inp']); s.res[W['out']] += 1; s.ws[id]['handcrafts'] += 1; s.hw += WORTH[W['out']]; done += 1
    return done

# ---------- actions ----------
def buy_lodge(s, id, frac=1.0):
    L = LODGES[id]; c = lodge_cost(s, id)
    if c <= frac * s.res[L['cres']]: s.res[L['cres']] -= c; s.lodge[id] += 1; return True
    return False
def build(s, id):
    W = WS[id]
    if not s.ws[id]['built'] and afford(s, W['build']): pay(s, W['build']); s.ws[id]['built'] = True; return True
    return False
def hire_foreman(s, id):
    w = s.ws[id]; W = WS[id]
    if w['built'] and w['crew'] == 0:
        if s.res[W['out']] >= W['foreman']: s.res[W['out']] -= W['foreman']; w['crew'] = 1; return True
        handcraft(s, id, 3)
    return False
def buy_crew(s, id, frac=1.0):
    w = s.ws[id]
    if w['built'] and w['crew'] >= 1:
        c = crew_cost(s, id)
        if c <= frac * s.res['sap']: s.res['sap'] -= c; w['crew'] += 1; return True
    return False
def grow(s, n=1):
    for _ in range(n):
        c = grow_cost(s)
        if s.res['sap'] >= c: s.res['sap'] -= c; s.spent_grow += c; s.height += grow_m(s); s.grows += 1
        else: return
def grow_to(h):
    def a(s):
        while s.height < h and s.res['sap'] >= grow_cost(s): grow(s)
    return a
def ritual(b):
    def a(s):
        R = RITUALS[b]
        if s.height >= R['h'] and s.bough == b-1 and afford(s, R['cost']): pay(s, R['cost']); s.bough = b
    return a
def carve(id):
    def a(s):
        c = rune_cost(s, id)
        if s.res[RUNES[id]['good']] >= c: s.res[RUNES[id]['good']] -= c; s.rune[id] += 1
    return a
def branch(s):
    c = 10 * 2.5 ** s.branch
    if s.res['beam'] >= c: s.res['beam'] -= c; s.branch += 1

def G(name, cond, act=lambda s: None, cost=None): return dict(name=name, cond=cond, act=act, cost=cost)
LANE = [
 G('Strike the trunk 5 times', lambda s: s.taps >= 5),
 G('GROW once', lambda s: s.grows >= 1, grow_to(1)),
 G('Hire a Sapper (15 Sap)', lambda s: s.lodge['sapper'] >= 1, lambda s: buy_lodge(s,'sapper')),
 G('3 Sappers', lambda s: s.lodge['sapper'] >= 3, lambda s: buy_lodge(s,'sapper')),
 G('Build the Kiln (40 Sap)', lambda s: s.ws['kiln']['built'], lambda s: build(s,'kiln')),
 G('Hand-craft 5 Resin (tap the Kiln)', lambda s: s.ws['kiln']['handcrafts'] >= 5, lambda s: handcraft(s,'kiln',3)),
 G('Hire the Kiln Foreman (25 Resin)', lambda s: s.ws['kiln']['crew'] >= 1, lambda s: hire_foreman(s,'kiln')),
 G('Hire a Peeler (60 Sap)', lambda s: s.lodge['peeler'] >= 1, lambda s: buy_lodge(s,'peeler')),
 G('GROW to 20 m (Sawmill hook)', lambda s: s.height >= 20, grow_to(20)),
 G('Build the Sawmill (30 Bark)', lambda s: s.ws['sawmill']['built'], lambda s: build(s,'sawmill')),
 G('Hire the Sawmill Foreman (25 Plank)', lambda s: s.ws['sawmill']['crew'] >= 1, lambda s: hire_foreman(s,'sawmill')),
 G('Sapper Lodge lvl 10 (x1.5)', lambda s: s.lodge['sapper'] >= 10, lambda s: buy_lodge(s,'sapper')),
 G('Carve Rune of Sap I (10 Resin)', lambda s: s.rune['runeSap'] >= 1, carve('runeSap'), cost={'resin':10}),
 G('GROW to 30 m (Roots line)', lambda s: s.height >= 30, grow_to(30)),
 G('Ritual: Bough 2 Roots (40 Plank + 20 Resin)', lambda s: s.bough >= 2, ritual(2), cost={'plank':40,'resin':20}),
 G('Hire a Digger (6 Resin)', lambda s: s.lodge['digger'] >= 1, lambda s: buy_lodge(s,'digger'), cost={'resin':6}),
 G('Build the Brickyard (20 Resin + 20 Stone)', lambda s: s.ws['brickyard']['built'], lambda s: build(s,'brickyard'), cost={'resin':20,'stone':20}),
 G('Hire the Brickyard Foreman (25 Brick)', lambda s: s.ws['brickyard']['crew'] >= 1, lambda s: hire_foreman(s,'brickyard')),
 G('GROW to 40 m (Beamworks hook)', lambda s: s.height >= 40, grow_to(40)),
 G('Build the Beamworks (30 Plank + 10 Resin)', lambda s: s.ws['beamworks']['built'], lambda s: build(s,'beamworks'), cost={'plank':30,'resin':10}),
 G('Hire the Beamworks Foreman (15 Beam)', lambda s: s.ws['beamworks']['crew'] >= 1, lambda s: hire_foreman(s,'beamworks')),
 G('Carve Rune of Bark I (10 Plank)', lambda s: s.rune['runeBark'] >= 1, carve('runeBark'), cost={'plank':10}),
 G('GROW to 60 m (Canopy line: sky turns gold)', lambda s: s.height >= 60, grow_to(60)),
 G('Ritual: Bough 3 Canopy (200 Plank + 40 Beam)', lambda s: s.bough >= 3, ritual(3), cost={'plank':200,'beam':40}),
 G('Hire a Weaver (10 Plank)', lambda s: s.lodge['weaver'] >= 1, lambda s: buy_lodge(s,'weaver'), cost={'plank':10}),
 G('Build the Ropewalk (20 Plank)', lambda s: s.ws['ropewalk']['built'], lambda s: build(s,'ropewalk'), cost={'plank':20}),
 G('Hire the Ropewalk Foreman (25 Cord)', lambda s: s.ws['ropewalk']['crew'] >= 1, lambda s: hire_foreman(s,'ropewalk')),
 G('Sprout a side branch (10 Beam) -> Apiary', lambda s: s.branch >= 1, branch, cost={'beam':10}),
 G('Hire a Beekeeper (5 Cord)', lambda s: s.lodge['beekeeper'] >= 1, lambda s: buy_lodge(s,'beekeeper'), cost={'cord':5}),
 G('Build the Glasshouse (15 Brick)', lambda s: s.ws['glasshouse']['built'], lambda s: build(s,'glasshouse'), cost={'brick':15}),
 G('Hire the Glasshouse Foreman (15 Glass)', lambda s: s.ws['glasshouse']['crew'] >= 1, lambda s: hire_foreman(s,'glasshouse')),
 G('Discover Lacquer + build the Lacquery (10 Beam + 5 Brick)', lambda s: s.ws['lacquery']['built'], lambda s: build(s,'lacquery'), cost={'beam':10,'brick':5}),
 G('Hire the Lacquery Foreman (15 Lacquer)', lambda s: s.ws['lacquery']['crew'] >= 1, lambda s: hire_foreman(s,'lacquery')),
 G('Sapper Lodge lvl 25 (x2)', lambda s: s.lodge['sapper'] >= 25, lambda s: buy_lodge(s,'sapper')),
 G("Carve Foreman's Bell I (10 Beam)", lambda s: s.rune['bell'] >= 1, carve('bell'), cost={'beam':10}),
 G('GROW to 200 m (Upper Trunk line)', lambda s: s.height >= 200, grow_to(200)),
 G('Ritual: Bough 4 Upper Trunk (300 Beam + 150 Brick + 60 Glass)', lambda s: s.bough >= 4, ritual(4), cost={'beam':300,'brick':150,'glass':60}),
 G('Build the Lanternry (20 Beam + 10 Glass)', lambda s: s.ws['lanternry']['built'], lambda s: build(s,'lanternry'), cost={'beam':20,'glass':10}),
 G('Hire the Lanternry Foreman (10 Lantern)', lambda s: s.ws['lanternry']['crew'] >= 1, lambda s: hire_foreman(s,'lanternry')),
 G('GROW to 400 m (Deep Roots line)', lambda s: s.height >= 400, grow_to(400)),
 G('Ritual: Bough 5 Deep Roots (1000 Beam + 300 Glass + 150 Lacquer)', lambda s: s.bough >= 5, ritual(5), cost={'beam':1000,'glass':300,'lacquer':150}),
 G('Hire a Miner (4 Beam)', lambda s: s.lodge['miner'] >= 1, lambda s: buy_lodge(s,'miner'), cost={'beam':4}),
 G('Build the Forge (30 Beam + 20 Brick)', lambda s: s.ws['forge']['built'], lambda s: build(s,'forge'), cost={'beam':30,'brick':20}),
 G('Hire the Forge Foreman (15 Ingot)', lambda s: s.ws['forge']['crew'] >= 1, lambda s: hire_foreman(s,'forge')),
 G('Reach 5 Rings (Season Turn)', lambda s: rings(s) >= 5),
 G('GROW to 800 m (Crown line)', lambda s: s.height >= 800, grow_to(800)),
 G('Ritual: Bough 6 Crown (2000 Lantern + 500 Ingot + 1000 Lacquer)', lambda s: s.bough >= 6, ritual(6), cost={'lantern':2000,'ingot':500,'lacquer':1000}),
]

def unlocked_lodges(s, gi):
    out = ['sapper']
    if gi >= 7: out.append('peeler')
    if s.bough >= 2: out.append('digger')
    if s.bough >= 3: out.append('weaver')
    if s.branch >= 1: out.append('beekeeper')
    if s.bough >= 5: out.append('miner')
    return out

def push_supply(s, res, depth=0):
    """Compass sub-step: increase supply of `res` (buy crew of its workshop or its lodge), recursing into starved inputs."""
    if depth > 4: return
    if res in RAW:
        lid = LODGE_OF.get(res)
        if lid: buy_lodge(s, lid, 0.25)
        return
    wid = WS_OF[res]; w = s.ws[wid]; W = WS[wid]
    if not w['built']: build(s, wid); return
    if w['crew'] == 0: hire_foreman(s, wid); return
    # starved? input stock below 30 s of capacity draw -> push that input; else buy crew
    cap = ws_capacity(s, wid)
    starved = [r for r, n in W['inp'].items() if s.res[r] < 30 * cap * n and s.gross[r] * FEED < cap * n]
    if starved:
        for r in starved: push_supply(s, r, depth+1)
    buy_crew(s, wid, 0.25)

def opportunistic(s, gi):
    goal = LANE[min(gi, len(LANE)-1)]
    sap_goal = any(k in goal['name'] for k in ('Sapper', 'Kiln (', 'Peeler'))
    # Compass sub-steps toward the goal's bottleneck
    if goal['cost']:
        deficits = {r: (n - s.res[r]) * WORTH[r] for r, n in goal['cost'].items() if s.res[r] < n}
        if deficits:
            bn = max(deficits, key=deficits.get)
            push_supply(s, bn)
    # GROW when sap comfortably above cost
    if not sap_goal:
        while s.res['sap'] >= grow_cost(s) * 3 and s.height < 2000: grow(s)
    # lodges (skip when overstocked: > 10 min of production idle)
    for id in unlocked_lodges(s, gi):
        L = LODGES[id]
        if s.lodge[id] >= 5 and s.res[L['res']] > 600 * max(s.gross[L['res']], 1e-9): continue
        for _ in range(5):
            if not buy_lodge(s, id, 0.2): break
    # foremen whenever affordable
    for id, w in s.ws.items():
        if w['built'] and w['crew'] == 0 and s.res[WS[id]['out']] >= WS[id]['foreman']: hire_foreman(s, id)
    # crew for workshops whose inputs are plentiful (not starved), cheap relative to sap
    for id, w in s.ws.items():
        if w['built'] and w['crew'] > 0:
            cap = ws_capacity(s, id)
            starved = any(s.gross[r] * FEED < cap * n for r, n in WS[id]['inp'].items())
            if starved: continue
            for _ in range(5):
                if not buy_crew(s, id, 0.1): break
    # runes when <= 50% of stock
    if s.rune['runeSap'] >= 1:
        for id, R in RUNES.items():
            c = rune_cost(s, id)
            if c <= 0.5 * s.res[R['good']] and s.rune[id] < 20: s.res[R['good']] -= c; s.rune[id] += 1
    if 1 <= s.branch < 3 and 10 * 2.5 ** s.branch <= 0.2 * s.res['beam']: branch(s)

def tap_fraction(t):
    if t < 180: return 1.0
    if t < 600: return 0.6
    if t < 1800: return 0.35
    return 0.2

def run(minutes, verbose=True):
    s = S(); dt = 0.5; gi = 0; last_min = -1; last_t = -1
    while s.t < minutes * 60:
        tapping = (s.t % 60) < 60 * tap_fraction(s.t)
        step(s, dt, tapping)
        if int(s.t) != last_t:
            last_t = int(s.t)
            if gi < len(LANE):
                LANE[gi]['act'](s)
                if LANE[gi]['cond'](s):
                    s.log.append((s.t, LANE[gi]['name'], idle_sap(s), s.hw, rings(s), s.height))
                    if verbose: print(f"{int(s.t)//60:3d}:{int(s.t)%60:02d}  #{gi+1:2d} {LANE[gi]['name']:<62} idleSap={idle_sap(s):10.1f}/s  HW={s.hw:9.3g}  rings={rings(s)}  h={s.height:6.0f}m")
                    gi += 1
            opportunistic(s, gi)
        m = int(s.t // 60)
        if verbose and m != last_min and m % 5 == 0:
            last_min = m
            stock = {k:int(v) for k,v in s.res.items() if v >= 1}
            print(f"   [min {m}] HW={s.hw:.3g} rings={rings(s)} idleSap={idle_sap(s):.0f}/s h={s.height:.0f}")
            if m % 20 == 0: print(f"   [min {m}] lodges={ {k:v for k,v in s.lodge.items() if v} } runes={ {k:v for k,v in s.rune.items() if v} } crew={ {k:w['crew'] for k,w in s.ws.items() if w['built']} } h={s.height:.0f} grows={s.grows} stock={stock}")
    return s

if __name__ == '__main__':
    s = run(MINUTES)
    print('final rings', rings(s), 'HW', f"{s.hw:.3g}", 'height', round(s.height), 'idle sap/s', round(idle_sap(s),1), 'grows', s.grows, 'sap spent on grow', f"{s.spent_grow:.3g}")
