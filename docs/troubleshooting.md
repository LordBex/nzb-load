# Fehlerbehebung für NZB-Load

Diese Seite enthält Lösungen für häufige Probleme, die bei der Verwendung des NZB-Load UserScripts auftreten können.

## Allgemeine Probleme

### Das Script reagiert nicht auf nzblnk: Links

**Mögliche Ursachen:**

1. Das UserScript ist nicht korrekt installiert
2. Der UserScript-Manager ist deaktiviert
3. Die Webseite blockiert das Ausführen von UserScripts

**Lösungen:**

1. Überprüfe, ob das Script in deinem UserScript-Manager als aktiv angezeigt wird
2. Stelle sicher, dass dein UserScript-Manager aktiviert ist
3. Aktualisiere die Seite und versuche es erneut
4. Installiere das Script neu, indem du die [Installationsanleitung](install.md) befolgst

### Das Menü wird nicht angezeigt

**Mögliche Ursachen:**

1. Die Ausgabe-Option ist nicht auf "menu" eingestellt
2. Es gibt ein Problem mit der Darstellung auf der aktuellen Webseite

**Lösungen:**

1. Überprüfe deine [Einstellungen](options.md) und stelle sicher, dass "Ausgabe" auf "menu" gesetzt ist
2. Versuche es auf einer anderen Webseite, um zu sehen, ob das Problem spezifisch für eine bestimmte Seite ist

## SABnzbd-Probleme

### Verbindung zu SABnzbd fehlgeschlagen

**Mögliche Ursachen:**

1. SABnzbd ist nicht gestartet
2. Die SABnzbd-URL ist falsch
3. Der API-Schlüssel ist ungültig
4. Netzwerkprobleme verhindern die Verbindung

**Lösungen:**

1. Stelle sicher, dass SABnzbd läuft und erreichbar ist
2. Überprüfe die SABnzbd-URL in den [Einstellungen](options.md)
3. Überprüfe, ob der API-Schlüssel korrekt ist
4. Versuche, die SABnzbd-Weboberfläche direkt in deinem Browser zu öffnen, um zu testen, ob sie erreichbar ist
5. Füge die Domain von SABnzbd im Script oben in der Zeile `// @connect deine.sab.domain.com` hinzu.
   Als Sicherheitsmaßnahme kann es sein, dass dein UserScript-Manager die Verbindung zu SABnzbd blockiert, wenn die
   Domain nicht explizit angegeben ist.
   Standard Domains wie localhost oder die für nzbindex.com sind bereits im Script angegeben.

### Kategorien werden nicht angezeigt

**Mögliche Ursachen:**

1. Es wurden keine Kategorien in den Einstellungen konfiguriert
2. Die Kategorien existieren nicht in SABnzbd

**Lösungen:**

1. Füge Kategorien in den [Einstellungen](options.md) hinzu
2. Stelle sicher, dass die Kategorien in SABnzbd existieren

## Download-Probleme

### NZB-Datei wird nicht heruntergeladen

**Mögliche Ursachen:**

1. Der Browser blockiert den Download
2. Der nzblnk: Link enthält ungültige Daten
3. Die Verbindung zu nzbindex.com oder anderen Quellen ist fehlgeschlagen

**Lösungen:**

1. Überprüfe die Download-Einstellungen deines Browsers
2. Stelle sicher, dass der nzblnk: Link korrekt formatiert ist
3. Versuche es später erneut, falls es sich um ein temporäres Verbindungsproblem handelt

### Dateiname ist falsch oder unvollständig

**Mögliche Ursachen:**

1. Der nzblnk: Link enthält keine oder ungültige Titelinformationen
2. Es gibt Probleme mit Sonderzeichen im Titel

**Lösungen:**

1. Stelle sicher, dass der nzblnk: Link einen Titel (t=) enthält
2. Benenne die Datei nach dem Download manuell um, falls nötig

## Einstellungsprobleme

### Einstellungen werden nicht gespeichert

**Mögliche Ursachen:**

1. Es gibt ein Problem mit dem UserScript-Manager

**Lösungen:**

1. Versuche, den Browser neu zu starten, und probiere es erneut
2. Prüfe, ob dein UserScript-Manager in der [Kompatibilitätsliste](userscripts-manager.md) aufgeführt ist
3. Teste, ob das Speichern der Einstellung mit einer älteren Version des Scripts funktioniert

### Einstellungsseite öffnet sich nicht (Userscripts App)

**Mögliche Ursachen:**

1. Die URL ist falsch
2. Das Script ist nicht korrekt installiert

**Lösungen:**

1. Stelle sicher, dass du die korrekte URL
   verwendest: [https://lordbex.github.io/nzb-load/settings.html](https://lordbex.github.io/nzb-load/settings.html)
2. Überprüfe, ob das Script in der Userscripts App aktiviert ist
3. Installiere das Script neu, indem du die [Installationsanleitung](install.md) befolgst

## Script-Aktualisierung

### Nach einem Update funktioniert das Script nicht mehr

**Mögliche Ursachen:**

1. Es gibt Konflikte mit alten Einstellungen
2. Der Browser verwendet noch eine zwischengespeicherte Version

**Lösungen:**

1. Deinstalliere das Script und installiere es neu
2. Starte deinen Browser neu

## Weitere Hilfe

Wenn dein Problem durch diese Fehlerbehebungsschritte nicht gelöst werden konnte, kannst du:

1. Ein Issue auf der [GitHub-Seite](https://github.com/LordBex/nzb-load/issues) erstellen
2. Den Autor kontaktieren: **LordBex**

Bitte füge bei der Meldung eines Problems folgende Informationen hinzu:

- Welchen Browser und UserScript-Manager du verwendest
- Eine genaue Beschreibung des Problems
- Schritte zum Reproduzieren des Problems
- Eventuelle Fehlermeldungen aus der Browser-Konsole (meist F12 drücken und zum Tab "Konsole" wechseln)