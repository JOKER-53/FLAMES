pipeline {
    agent any

    stages {
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
