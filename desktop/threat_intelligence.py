"""
Net Guard — Threat Intelligence (threat_intelligence.py)
─────────────────────────────────────────────────────────
Pattern-based scanner for known malicious JavaScript signatures.
Zero external dependencies — works in both dev and PyInstaller .exe.
"""

import re 
from typing import Dict ,List 

_SEVERITY_SCORES ={
"critical":4 ,
"high":3 ,
"medium":2 ,
"low":1 ,
}

_PATTERNS ={
"data_exfiltration":{
"severity":"critical",
"label":"Data exfiltration",
"patterns":[
r"fetch\(['\"]https?://[^'\"]+['\"],\s*\{[^}]*method:\s*['\"]POST['\"]",
r"XMLHttpRequest.*open\(['\"]POST['\"]",
r"navigator\.sendBeacon\(",
r"chrome\.runtime\.sendMessage.*credentials",
],
},
"keylogger":{
"severity":"high",
"label":"Keylogger",
"patterns":[
r"addEventListener\(['\"]key(down|press|up)['\"]",
r"document\.onkey(down|press|up)\s*=",
],
},
"crypto_miner":{
"severity":"critical",
"label":"Crypto miner",
"patterns":[
r"CoinHive|coinhive",
r"cryptonight|monero",
r"WebSocket.*wss://.*pool\.",
r"miner\.start\(",
],
},
"obfuscation":{
"severity":"high",
"label":"Code obfuscation",
"patterns":[
r"eval\(atob\(",
r"Function\(.*atob\(",
r"(\\x[0-9a-fA-F]{2}){4,}",
],
},
"credential_theft":{
"severity":"critical",
"label":"Credential theft",
"patterns":[
r"chrome\.cookies\.getAll",
r"localStorage\.getItem.*token",
r"sessionStorage\.getItem.*auth",
r"document\.cookie.*match.*session",
],
},
"c2_communication":{
"severity":"critical",
"label":"C2 communication",
"patterns":[
r"WebSocket\(['\"]wss?://(?!https://netguard-api.noit.eu)[^'\"]+['\"]",
r"setInterval.*fetch.*command",
],
},
}

_RISKY_COMBOS =[
({"chrome.cookies","fetch"},"Credential exfiltration combo"),
({"chrome.tabs","chrome.webRequest","fetch"},"Man-in-the-middle combo"),
({"chrome.debugger","chrome.tabs"},"Remote debugging combo"),
]

def scan_code (code :str )->Dict :
    """
    Scan a JavaScript code snippet for known malicious patterns.
    Returns a dict with: threats (list), risk_contribution (int), flags (list[str])
    """
    if not code :
        return {"threats":[],"risk_contribution":0 ,"flags":[]}

    threats =[]
    risk =0 
    flags =[]

    for threat_type ,cfg in _PATTERNS .items ():
        for pattern in cfg ["patterns"]:
            if re .search (pattern ,code ,re .IGNORECASE |re .DOTALL ):
                threats .append ({
                "type":threat_type ,
                "severity":cfg ["severity"],
                "label":cfg ["label"],
                })
                risk +=_SEVERITY_SCORES [cfg ["severity"]]
                flags .append (cfg ["label"])
                break 

    return {
    "threats":threats ,
    "risk_contribution":min (risk ,10 ),
    "flags":list (set (flags )),
    }


def scan_permissions (permissions :List [str ],host_permissions :List [str ]=None )->Dict :
    """
    Analyse permission lists for dangerous combinations.
    Returns: risk_contribution (int), flags (list[str])
    """
    perm_set =set (permissions or [])
    host_str =" ".join (host_permissions or [])

    risk =0 
    flags =[]

    _PERM_SCORES ={
    "debugger":4 ,
    "nativeMessaging":3 ,
    "proxy":3 ,
    "webRequest":2 ,
    "webRequestBlocking":2 ,
    "cookies":2 ,
    "history":2 ,
    "tabs":1 ,
    "bookmarks":1 ,
    "downloads":1 ,
    }

    for perm ,score in _PERM_SCORES .items ():
        if perm in perm_set :
            risk +=score 
            flags .append (f"Permission: {perm }")

    if "<all_urls>"in host_str :
        risk +=3 
        flags .append ("Access to all websites")
    elif re .search (r"https?://\*",host_str ):
        risk +=2 
        flags .append ("Broad HTTP host access")

    for combo_set ,label in _RISKY_COMBOS :
        if combo_set .issubset (perm_set ):
            risk +=3 
            flags .append (label )

    return {
    "risk_contribution":min (risk ,10 ),
    "flags":list (set (flags )),
    }
