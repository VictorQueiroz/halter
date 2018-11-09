tdd:
	./node_modules/.bin/sarg \
		--require @babel/register \
		-w test,src \
		-r test \
		--ignore=test/history-fake.js \
		--ignore=test/react-components.js \
		--bail

test:
	./node_modules/.bin/sarg \
		--require ts-node/register \
		--ignore=test/history-fake.js \
		--ignore=test/react-components.js \
		--bail \
		"test/**/*.ts"

release: test
	npx tsc && \
	echo 'success!'

.PHONY: release tdd test
