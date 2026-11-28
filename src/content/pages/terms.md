---
title: Regulamin
description: Zasady korzystania z po ludzku, dane sesji i prawa użytkownika.
lang: pl
slug: terms
---

Obowiązuje od 26 listopada 2026 r.

## Wydawca i kontakt

Serwis po ludzku wydaje Fundacja Serio, ul. Lema 2C/57, 80-126 Gdańsk.

- KRS 0001260622
- NIP 5833576778
- REGON 545486785
- kontakt: kontakt@serio.org.pl

## Co robi serwis

po ludzku pokazuje zadania z GitHuba: czyj jest ruch i co będzie dalej. Czyta dane przez aplikację GitHub App „po ludzku”. Nigdy niczego nie zapisuje w GitHubie.

Publiczne repozytorium otwiera się bez logowania, ale tylko wtedy, gdy jego właściciel zainstalował tę aplikację. Repozytoria prywatne otwierają się tylko po zalogowaniu, jeśli masz do nich dostęp na GitHubie.

## Logowanie przez GitHub

Logujesz się przez GitHub. Przeglądarka zapamiętuje jedno ciasteczko sesji. Ma ono atrybut HTTP-only i zawiera tylko losowy identyfikator.

Serwer trzyma Twój token GitHub w Durable Object w Cloudflare, najwyżej przez 8 godzin. Wylogowanie usuwa go od razu. Nie zapisujemy tokenu odświeżania. Po wygaśnięciu sesji zalogujesz się ponownie.

## Pamięć podręczna i awatary

Anonimowe widoki publicznych repozytoriów trafiają do pamięci podręcznej na najwyżej 60 sekund. Przed każdym pokazaniem serwer sprawdza dostęp jeszcze raz.

Awatary pobiera z GitHuba serwer i podaje je z poludzku.info. Twoja przeglądarka nie łączy się z GitHubem.

## Śledzenie i ciasteczka

Nie śledzimy. Nie ma analityki ani reklam. Jedyne ciasteczko to ciasteczko sesji po zalogowaniu.

## Dane osobowe

Administratorem danych sesji jest Fundacja Serio. Podstawą jest art. 6 ust. 1 lit. b RODO (prowadzenie sesji, o którą prosisz) oraz lit. f (bezpieczeństwo serwisu).

Masz prawo dostępu do danych i ich usunięcia. Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (PUODO). Napisz na kontakt@serio.org.pl.

Podmioty przetwarzające:

- Cloudflare: hosting serwisu.
- GitHub: logowanie i źródło danych, na własnych zasadach GitHuba.

## Gra Find the Gap

Gra pod `/game` nie zakłada konta i nie zapisuje adresu IP. Twoje typy trafiają do badań tylko wtedy, gdy sam włączysz przełącznik badań: zapisujemy wtedy dzień, wersję i poziom gry oraz przebieg rozgrywki, bez żadnego identyfikatora. Pseudonim do rankingu zapisujemy tylko, gdy go wpiszesz, razem z wynikiem; dziesięć najlepszych wyników jest widocznych publicznie. Podstawą jest Twoja zgoda (art. 6 ust. 1 lit. a RODO). Dane usuwamy po 365 dniach. Pseudonim usuniemy wcześniej na prośbę wysłaną na kontakt@serio.org.pl.

## Dostępność serwisu

Serwis działa bez gwarancji. Może być niedostępny lub pokazywać dane z opóźnieniem.

## Licencje

Kod jest na licencji MIT. Teksty są na licencji CC BY 4.0.

## Zmiany regulaminu

Zmiany ogłaszamy na tej stronie z nową datą. Obecna wersja obowiązuje od 26 listopada 2026 r.
