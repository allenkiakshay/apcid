# APCID Project

## Overview
APCID is a project designed to [brief description of the project]. This README provides instructions on how to build and run the project.

## How to Build
1. Ensure you have the required dependencies installed by running:
    ```bash
    npm install
    ```

2. Clone the repository:
    ```bash
    git clone https://github.com/allenkiakshay/apcid.git
    cd apcid
    ```

3. Build the project:
    ```bash
    npm run build
    ```

## How to Run
1. Before running the project, create a folder named `uploads` in the project directory. Inside the `uploads` folder, create another folder named `QPS`. Upload the required question papers into the `QPS` folder, as the project will pick the question papers from this location.

2. After building the project, you can run it using:
    ```bash
    npm run dev
    ```

3. Optional: Provide configuration or arguments if required:
    ```bash
    npm run dev -- --config=config.yaml
    ```

## Environment Variables
Before running the project, ensure the following environment variables are set:

- `NEXTAUTH_SECRET`: Generate a secret using:
    ```bash
    openssl rand -base64 32
    ```
- `NEXTAUTH_URL`: The base URL of the site (e.g., `http://localhost:3000` or `http://<your-ip-address>:3000` if running on an IP address).
- `DATABASE_URL`: Replace with your actual database URL, e.g.,:
    ```
    postgresql://user:password@host:port/database
    ```
- `JWT_SECRET`: Generate a secret using:
    ```bash
    openssl rand -base64 32
    ```

## Additional Information
- For detailed documentation, refer to the [docs](docs/).
- If you encounter issues, please check the [issues](https://github.com/allenkiakshay/apcid/issues) page or contact the maintainers.


## Folder Structure in `uploads`

The `uploads` folder is structured as follows:

```
uploads/
├── halticketno/
│   ├── original/
│   │   └── [all original files]
│   ├── pdf/
│   │   └── [all files converted to PDF with signature at the end]
│   └── merged_hallticketno.pdf
└── QPS/
    └── [all question papers]
```

### Explanation:
- **`halticketno/`**: Contains subfolders and files related to hall tickets.
  - **`original/`**: Stores all original files.
  - **`pdf/`**: Contains files converted to PDF format, with signatures appended at the end.
  - **`merged_hallticketno.pdf`**: A single merged PDF file for the hall ticket number.

- **`QPS/`**: Stores all question papers required for the project.
