```mermaid
graph TB
    A[User Input] --> B{Validation Type}
    B -->|Single Email| C[Web Interface - Single Tab]
    B -->|Bulk Emails| D[Web Interface - Bulk Tab]
    B -->|CSV Upload| E[Web Interface - CSV Tab]
    
    C --> F[Enter Email Address]
    F --> G[Send POST /v1/validate]
    G --> H[Backend Validation Process]
    
    D --> I[Enter Multiple Emails]
    I --> J[Send POST /v1/validate/bulk]
    J --> K[Create Job - Return Job ID]
    K --> L[Process Emails in Background]
    
    E --> M[Upload CSV File]
    M --> N[Parse CSV Headers]
    N --> O[Select Email Column]
    O --> P[Send POST /v1/validate/bulk/csv]
    P --> Q[Create Job - Return Job ID]
    Q --> R[Process Emails in Background]
    
    H --> S[Syntax Check]
    S --> T[Domain Processing]
    T --> U[MX Lookup]
    U --> V{Skip SMTP?}
    V -->|No| W[SMTP Verification]
    V -->|Yes| X[Scoring]
    W --> X[Scoring]
    X --> Y[Return JSON Result]
    Y --> Z[Display Results in UI]
    
    L --> AA[Job Processing]
    AA --> AB[Batch Email Validation]
    AB --> AC[Update Job Progress]
    AC --> AD{Job Complete?}
    AD -->|No| AC
    AD -->|Yes| AE[Store Results]
    
    R --> AF[Job Processing]
    AF --> AG[Batch Email Validation]
    AG --> AH[Update Job Progress]
    AH --> AI{Job Complete?}
    AI -->|No| AH
    AI -->|Yes| AJ[Store Results]
    
    AE --> AK[Job Tracking Tab]
    AJ --> AK[Job Tracking Tab]
    
    AK --> AL[Enter Job ID]
    AL --> AM{Action}
    AM -->|Check Status| AN[GET /v1/jobs/{jobId}]
    AM -->|Get JSON Results| AO[GET /v1/jobs/{jobId}/results]
    AM -->|Download CSV| AP[GET /v1/jobs/{jobId}/results/csv]
    
    AN --> AQ[Display Job Status]
    AO --> AR[Display JSON Results]
    AP --> AS[Generate CSV File]
    AS --> AT[Browser Download]
    
    Z --> AU[Final Output]
    AQ --> AU
    AR --> AU
    AT --> AU[Download Complete]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#e8f5e8
    style E fill:#e8f5e8
    style H fill:#fff3e0
    style L fill:#fff3e0
    style R fill:#fff3e0
    style AA fill:#f1f8e9
    style AF fill:#f1f8e9
    style AK fill:#fce4ec
    style AU fill:#bbdefb
```