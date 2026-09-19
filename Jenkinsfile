pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Create Environment') {
            steps {
                withCredentials([string(credentialsId: 'nvidia-nim-api-key', variable: 'NVIDIA_NIM_API_KEY')]) {
                    sh '''
                        cat > packages/backend/.env <<EOF
PORT=4000
NVIDIA_NIM_API_KEY=${NVIDIA_NIM_API_KEY}
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct
FRONTEND_ORIGIN=http://localhost:5173
EOF
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'docker compose ps'
            }
        }
    }

    post {
        success {
            echo 'FLAMES CI/CD pipeline completed successfully!'
        }

        failure {
            echo 'FLAMES CI/CD pipeline failed!'
        }
    }
}
