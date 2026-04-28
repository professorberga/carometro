# Security Spec - Carômetro Escolar

## 1. Data Invariants
- A `turma` must have a name, series, period, and year.
- An `aluno` must be linked to an existing `turma`.
- `ra` for an `aluno` must be unique.
- Only users with the `gestor` role can create, update, or delete `turmas` and `alunos`.
- All users (gestores and professores) must be authenticated.
- Profile `role` cannot be changed by the user themselves.

## 2. The "Dirty Dozen" Payloads (Denial Examples)
1. **Identity Spoofing**: Attempt to create an `aluno` with an `ownerId` that isn't the logged-in user (though we don't use ownerId, we use role-based access).
2. **Privilege Escalation**: A `professor` trying to create a `turma`.
3. **Ghost Fields**: Adding a field like `isVerified: true` to an `aluno` document.
4. **Invalid Type**: Sending a string for `anoLetivo` in `turmas`.
5. **ID Poisoning**: Using a 2MB string as a document ID.
6. **Orphaned Aluno**: Creating an `aluno` with a `turmaId` that doesn't exist.
7. **Role Modification**: Trying to change one's own `role` from `professor` to `gestor`.
8. **PII Leak**: A teacher trying to access private user data of another teacher (if any).
9. **Bulk Scrape**: Querying all students without a `turma` filter (if we want to restrict to specific queries).
10. **Shadow Delete**: A student trying to delete their own record.
11. **Timestamp Spoofing**: Sending a client-side date for `criadoEm`.
12. **Incomplete Turma**: Creating a `turma` without a name.

## 3. Test Runner (Draft rules tests)
I will implement the rules to block these.
